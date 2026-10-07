import React, { useState, useEffect, useCallback } from 'react';
import { paymentApi } from '../api/payment';
import { partyApi } from '../api/party';
import type { Party, PartyLedgerResponse, PaymentFloor } from '../types';
import { BillingType } from '../types';
import { todayLocal } from '../utils/format';
import PartyLedgerModal from '../components/PartyLedgerModal';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import ViewIcon from '../assets/view.svg';
import './PaymentReminderPage.css';

interface PaymentReminderPageProps {
  floor: PaymentFloor;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '₹ 0';
  return `₹ ${amount.toLocaleString('en-IN')}`;
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

interface PartyLedgerRow {
  party: Party;
  ledger: PartyLedgerResponse | null;
  loading: boolean;
  error: boolean;
}

const PaymentReminderPage: React.FC<PaymentReminderPageProps> = ({ floor }) => {
  const [partyRows, setPartyRows] = useState<PartyLedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPartyId, setExpandedPartyId] = useState<number | null>(null);
  const [detailLedger, setDetailLedger] = useState<PartyLedgerResponse | null>(null);
  const [receivingParty, setReceivingParty] = useState<{ party: Party; ledger: PartyLedgerResponse | null; mode: 'official' | 'offline' } | null>(null);
  const [receiveAmount, setReceiveAmount] = useState<number | ''>('');
  const [receiveLoading, setReceiveLoading] = useState(false);
  const [receiveError, setReceiveError] = useState<string | null>(null);

  // Date range: all payments (past and future)
  const startDate = '2020-01-01';
  const endDate = '2099-12-31';

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const parties = await partyApi.getAllParties();

      // Initialize rows with loading state
      const initialRows: PartyLedgerRow[] = parties.map((p) => ({
        party: p,
        ledger: null,
        loading: true,
        error: false,
      }));
      setPartyRows(initialRows);

      // Fetch ledger for each party in parallel
      const ledgerPromises = parties.map(async (p) => {
        try {
          const ledger = await paymentApi.getPartyLedger(p.partyId, startDate, endDate);
          return { partyId: p.partyId, ledger, error: false };
        } catch {
          return { partyId: p.partyId, ledger: null, error: true };
        }
      });

      const results = await Promise.all(ledgerPromises);

      setPartyRows((prev) =>
        prev.map((row) => {
          const result = results.find((r) => r.partyId === row.party.partyId);
          if (result) {
            return { ...row, ledger: result.ledger, loading: false, error: result.error };
          }
          return { ...row, loading: false };
        })
      );
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpand = (partyId: number) => {
    setExpandedPartyId((prev) => (prev === partyId ? null : partyId));
  };

  // Received so far against the party's orders in one mode
  const receivedInMode = (ledger: PartyLedgerResponse | null, mode: 'official' | 'offline') =>
    (ledger?.orders || []).reduce((sum, o) => sum + (o.paymentSummary?.[mode]?.receivedAmount || 0), 0);

  // What the party still owes in one mode: its running balance less what was received on its orders
  const dueInMode = (party: Party, ledger: PartyLedgerResponse | null, mode: 'official' | 'offline') => {
    const balance = mode === 'official' ? (party.officialAmount || 0) : (party.offlineAmount || 0);
    return Math.max(0, Math.round((balance - receivedInMode(ledger, mode)) * 100) / 100);
  };

  // A party-level receipt is recorded against the party's orders, oldest due first, so it shows
  // as Received and in the ledger. Only what is left after every order is paid comes off the
  // party's stored balance (the balance from before the ERP, which has no order to pay against).
  const handleReceiveSubmit = async () => {
    if (!receivingParty || receiveAmount === '' || Number(receiveAmount) <= 0) return;
    const { party, ledger, mode } = receivingParty;
    const amount = Math.round(Number(receiveAmount) * 100) / 100;
    const available = dueInMode(party, ledger, mode);
    if (amount > available + 0.01) {
      setReceiveError(`Amount cannot exceed ${mode} due of ${formatCurrency(available)}`);
      return;
    }
    const billingType = mode === 'official' ? BillingType.OFFICIAL : BillingType.OFFLINE;
    const today = todayLocal();
    const dueOrders = [...(ledger?.orders || [])]
      .filter((o) => (o.paymentSummary?.[mode]?.dueAmount || 0) > 0)
      .sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime() || a.orderId - b.orderId);

    let left = amount;
    try {
      setReceiveLoading(true);
      for (const order of dueOrders) {
        if (left <= 0) break;
        const due = order.paymentSummary?.[mode]?.dueAmount || 0;
        const portion = Math.round(Math.min(left, due) * 100) / 100;
        if (portion <= 0) continue;
        const payment = await paymentApi.getPaymentByOrderAndMode(order.orderId, billingType);
        await paymentApi.receivePayment(payment.id, { newReceivedAmount: portion, newReceivedDate: today });
        left = Math.round((left - portion) * 100) / 100;
      }
      if (left > 0) {
        const officialAmount = party.officialAmount || 0;
        const offlineAmount = party.offlineAmount || 0;
        await partyApi.updateParty(party.partyId, {
          name: party.name,
          officialAmount: mode === 'official' ? Math.round((officialAmount - left) * 100) / 100 : officialAmount,
          offlineAmount: mode === 'offline' ? Math.round((offlineAmount - left) * 100) / 100 : offlineAmount,
          floor: party.floor,
        });
      }
      setReceivingParty(null);
      setReceiveAmount('');
      setReceiveError(null);
    } catch (err) {
      console.error('Failed to record payment:', err);
      setReceiveError(
        left < amount
          ? `Recorded ${formatCurrency(amount - left)} only, ${formatCurrency(left)} failed. Please check the ledger.`
          : 'Failed to save. Please try again.'
      );
    } finally {
      setReceiveLoading(false);
      await fetchData();
    }
  };

  // Filter by search
  const filteredRows = partyRows.filter((row) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return row.party.name.toLowerCase().includes(q);
  });

  // The party's stored amounts are its running balance: the balance from before the ERP plus
  // every order (official bill + GST / offline total) minus what was received here. Orders are
  // already inside it, so the ledger's order totals must not be added on top.
  const partyRemaining = (r: PartyLedgerRow) =>
    (r.party.officialAmount || 0) + (r.party.offlineAmount || 0) - (r.ledger?.totalReceivedAmount || 0);

  const totalOfficial = partyRows.reduce((sum, r) => sum + (r.party.officialAmount || 0), 0);
  const totalOffline = partyRows.reduce((sum, r) => sum + (r.party.offlineAmount || 0), 0);
  const totalReceived = partyRows.reduce((sum, r) => sum + (r.ledger?.totalReceivedAmount || 0), 0);
  const totalRemaining = partyRows.reduce((sum, r) => sum + partyRemaining(r), 0);

  return (
    <div className="payment-reminder-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Payment Reminder</h1>
          <p className="page-subtitle">Track party ledgers and payment details</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Official</span>
            <span className="stat-value">{formatCurrency(totalOfficial)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Offline</span>
            <span className="stat-value">{formatCurrency(totalOffline)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Received</span>
            <span className="stat-value">{formatCurrency(totalReceived)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Remaining</span>
            <span className="stat-value">{formatCurrency(totalRemaining)}</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search by party name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="payment-table-container">
        {loading ? (
          <Loading message="Loading party ledgers..." size="large" />
        ) : (
          <table className="payment-table">
            <thead>
              <tr>
                <th>Party Name</th>
                <th>Official Amount</th>
                <th>Offline Amount</th>
                <th>Received</th>
                <th>Remaining</th>
                <th>Orders</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">No parties found.</td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isExpanded = expandedPartyId === row.party.partyId;
                  const orderCount = row.ledger?.orders?.length || 0;

                  return (
                    <React.Fragment key={row.party.partyId}>
                      {/* Party summary row */}
                      <tr
                        className={`payment-row ${orderCount > 0 ? 'clickable' : ''}`}
                        onClick={() => orderCount > 0 && toggleExpand(row.party.partyId)}
                      >
                        <td className="party-name-cell">
                          <div className="party-name-inner">
                            <span>{row.party.name}</span>
                            {orderCount > 0 && (
                              <span className={`collapse-chevron ${isExpanded ? 'expanded' : ''}`}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="6 9 12 15 18 9" />
                                </svg>
                              </span>
                            )}
                          </div>
                        </td>
                        <td>{row.loading ? '...' : formatCurrency(row.party.officialAmount)}</td>
                        <td>{row.loading ? '...' : formatCurrency(row.party.offlineAmount)}</td>
                        <td>{row.loading ? '...' : formatCurrency(row.ledger?.totalReceivedAmount)}</td>
                        <td>{row.loading ? '...' : formatCurrency(partyRemaining(row))}</td>
                        <td>{row.loading ? '...' : orderCount}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="view-ledger-btn"
                              title="View Full Ledger"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (row.ledger) setDetailLedger(row.ledger);
                              }}
                              disabled={!row.ledger}
                            >
                              <img src={ViewIcon} alt="View" className="view-icon" />
                            </button>
                            {!row.loading && dueInMode(row.party, row.ledger, 'official') > 0 && (
                              <button
                                type="button"
                                className="receive-payment-btn receive-payment-btn--official"
                                title={`Receive against Official due: ${formatCurrency(dueInMode(row.party, row.ledger, 'official'))}`}
                                onClick={(e) => { e.stopPropagation(); setReceivingParty({ party: row.party, ledger: row.ledger, mode: 'official' }); setReceiveAmount(''); setReceiveError(null); }}
                              >
                                Official
                              </button>
                            )}
                            {!row.loading && dueInMode(row.party, row.ledger, 'offline') > 0 && (
                              <button
                                type="button"
                                className="receive-payment-btn receive-payment-btn--offline"
                                title={`Receive against Offline due: ${formatCurrency(dueInMode(row.party, row.ledger, 'offline'))}`}
                                onClick={(e) => { e.stopPropagation(); setReceivingParty({ party: row.party, ledger: row.ledger, mode: 'offline' }); setReceiveAmount(''); setReceiveError(null); }}
                              >
                                Offline
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Party base amount breakdown row */}
                      {isExpanded && (
                        <tr className="expanded-order-row">
                          <td colSpan={7}>
                            <div className="party-base-breakdown">
                              <span className="party-base-label">Includes</span>
                              <span className="party-base-item">Orders Official: <strong>{formatCurrency(row.ledger?.totalOfficialAmount)}</strong></span>
                              <span className="party-base-item">Orders Offline: <strong>{formatCurrency(row.ledger?.totalOfflineAmount)}</strong></span>
                              <span className="party-base-item">Previous Official: <strong>{formatCurrency((row.party.officialAmount || 0) - (row.ledger?.totalOfficialAmount || 0))}</strong></span>
                              <span className="party-base-item">Previous Offline: <strong>{formatCurrency((row.party.offlineAmount || 0) - (row.ledger?.totalOfflineAmount || 0))}</strong></span>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Expanded orders */}
                      {isExpanded && row.ledger?.orders && row.ledger.orders.map((order) => (
                        <React.Fragment key={order.orderId}>
                          {/* Order row */}
                          <tr className="expanded-order-row">
                            <td colSpan={7}>
                              <div className="expanded-order-summary">
                                <span className="expanded-order-id">Order #{order.orderId}</span>
                                <span className="expanded-order-detail">{row.party.name}</span>
                                <span className="expanded-order-detail">Date: {formatDate(order.orderDate)}</span>
                                <span className="expanded-order-detail">Official: {formatCurrency(order.paymentSummary?.official?.totalAmount)}</span>
                                <span className="expanded-order-detail">Offline: {formatCurrency(order.paymentSummary?.offline?.totalAmount)}</span>
                                <span className="expanded-order-detail">Products: {order.products?.length || 0}</span>
                              </div>

                              {/* Products sub-table */}
                              {order.products && order.products.length > 0 && (
                                <table className="expanded-products-table">
                                  <thead>
                                    <tr>
                                      <th>Product</th>
                                      <th>Qty (Kg)</th>
                                      <th>Qty (Pc)</th>
                                      <th>Market Rate</th>
                                      <th>Rate Diff</th>
                                      <th>Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {order.products.map((p) => (
                                      <tr key={p.id}>
                                        <td>{p.productName}</td>
                                        <td>{p.quantityKg || '—'}</td>
                                        <td>{p.quantityPc || '—'}</td>
                                        <td>{formatCurrency(p.marketRate)}</td>
                                        <td>{formatCurrency(p.rateDifference)}</td>
                                        <td>{formatCurrency(p.totalAmount)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Full detail modal (eye icon click) */}
      {detailLedger && (
        <PartyLedgerModal
          ledger={detailLedger}
          floor={floor}
          onClose={() => setDetailLedger(null)}
          onFullPaymentSuccess={() => fetchData()}
        />
      )}

      {/* Receive payment modal for party base amounts */}
      {receivingParty && (
        <div className="modal-overlay" onClick={() => setReceivingParty(null)}>
          <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Receive Payment</h2>
            <p className="receive-modal-subtitle">
              <strong>{receivingParty.party.name}</strong> — {receivingParty.mode === 'official' ? 'Official' : 'Offline'} Due:{' '}
              <strong>{formatCurrency(dueInMode(receivingParty.party, receivingParty.ledger, receivingParty.mode))}</strong>
            </p>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">Amount Received*</label>
                <input
                  type="number"
                  className={`form-input${receiveError ? ' input-error' : ''}`}
                  placeholder="Enter amount"
                  value={receiveAmount}
                  onChange={(e) => { setReceiveError(null); setReceiveAmount(e.target.value === '' ? '' : Number(e.target.value)); }}
                  min="0"
                  step="0.01"
                  autoFocus
                />
                {receiveError && <span className="receive-field-error">{receiveError}</span>}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="save-button"
                  onClick={handleReceiveSubmit}
                  disabled={receiveLoading || receiveAmount === '' || Number(receiveAmount) <= 0}
                >
                  {receiveLoading ? 'Saving...' : 'Confirm'}
                </button>
                <button type="button" className="cancel-button" onClick={() => setReceivingParty(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentReminderPage;
