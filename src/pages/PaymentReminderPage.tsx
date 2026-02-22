import React, { useState, useEffect, useCallback } from 'react';
import { paymentApi } from '../api/payment';
import { partyApi } from '../api/party';
import type { Party, PartyLedgerResponse, PaymentFloor } from '../types';
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

  // Default date range: last 1 year
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  const startDate = oneYearAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

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

  // Filter by search
  const filteredRows = partyRows.filter((row) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return row.party.name.toLowerCase().includes(q);
  });

  // Compute summary stats from all ledgers
  const totalOfficial = partyRows.reduce((sum, r) => sum + (r.ledger?.totalOfficialAmount || 0), 0);
  const totalOffline = partyRows.reduce((sum, r) => sum + (r.ledger?.totalOfflineAmount || 0), 0);
  const totalReceived = partyRows.reduce((sum, r) => sum + (r.ledger?.totalReceivedAmount || 0), 0);
  const totalRemaining = partyRows.reduce((sum, r) => sum + (r.ledger?.totalRemainingAmount || 0), 0);

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
                        <td>{row.loading ? '...' : formatCurrency(row.ledger?.totalOfficialAmount)}</td>
                        <td>{row.loading ? '...' : formatCurrency(row.ledger?.totalOfflineAmount)}</td>
                        <td>{row.loading ? '...' : formatCurrency(row.ledger?.totalReceivedAmount)}</td>
                        <td>{row.loading ? '...' : formatCurrency(row.ledger?.totalRemainingAmount)}</td>
                        <td>{row.loading ? '...' : orderCount}</td>
                        <td>
                          <button
                            type="button"
                            className="view-ledger-btn"
                            title="View Full Ledger"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (row.ledger) {
                                setDetailLedger(row.ledger);
                              }
                            }}
                            disabled={!row.ledger}
                          >
                            <img src={ViewIcon} alt="View" className="view-icon" />
                          </button>
                        </td>
                      </tr>

                      {/* Expanded orders */}
                      {isExpanded && row.ledger?.orders && row.ledger.orders.map((order) => (
                        <React.Fragment key={order.orderId}>
                          {/* Order row */}
                          <tr className="expanded-order-row">
                            <td colSpan={7}>
                              <div className="expanded-order-summary">
                                <span className="expanded-order-id">Order #{order.orderId}</span>
                                <span className="expanded-order-detail">Date: {formatDate(order.orderDate)}</span>
                                <span className="expanded-order-detail">Official: {formatCurrency(order.officialGrandTotal)}</span>
                                <span className="expanded-order-detail">Offline: {formatCurrency(order.offlineGrandTotal)}</span>
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
        />
      )}
    </div>
  );
};

export default PaymentReminderPage;
