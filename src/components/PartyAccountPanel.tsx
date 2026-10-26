import React, { useCallback, useEffect, useState } from 'react';
import { accountsApi, errorMessage } from '../api/accounts';
import { isOwner } from '../lib/auth';
import { formatDate, formatMoney } from '../utils/format';
import type { AccountOrder, BillingType, PartyAccount, PaymentFloor, PaymentReceipt } from '../types';
import Loading from './Loading';
import ReceivePaymentModal from './ReceivePaymentModal';
import StatementDownloadModal from './StatementDownloadModal';
import './PartyAccountPanel.css';

interface PartyAccountPanelProps {
  partyId: number;
  partyName: string;
  /** The floor being worked on; empty for every floor the user may see */
  floor?: PaymentFloor | '';
  /** Opens straight into the receive form */
  startReceiving?: boolean;
  onClose: () => void;
  /** Called after a payment or opening balance changed, so lists behind can refresh */
  onChanged?: () => void;
}

type Tab = 'payments' | 'orders';

const floorName = (floor?: string | null) =>
  floor === 'GROUND_FLOOR' ? 'Ground Floor' : floor === 'FIRST_FLOOR' ? 'First Floor' : null;

const orderStatus = (order: AccountOrder): { label: string; tone: 'paid' | 'part' | 'unpaid' } => {
  const due = Math.max(0, order.official.due) + Math.max(0, order.offline.due);
  const received = order.official.received + order.offline.received;
  if (due <= 0.004) return { label: 'Paid', tone: 'paid' };
  if (received > 0) return { label: 'Part paid', tone: 'part' };
  return { label: 'Unpaid', tone: 'unpaid' };
};

const paidTowards = (receipt: PaymentReceipt) =>
  receipt.allocations.length === 0
    ? ['Not applied']
    : receipt.allocations.map((a) =>
        `${a.orderId == null ? 'Opening balance' : `Order #${a.orderId}`}${a.orderDate ? ` (${formatDate(a.orderDate)})` : ''}: ${formatMoney(a.amount)}`,
      );

const PartyAccountPanel: React.FC<PartyAccountPanelProps> = ({
  partyId,
  partyName,
  floor = '',
  startReceiving = false,
  onClose,
  onChanged,
}) => {
  const [account, setAccount] = useState<PartyAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('payments');
  const [receiving, setReceiving] = useState<BillingType | true | false>(startReceiving);
  const [statementOpen, setStatementOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<PaymentReceipt | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingOpening, setEditingOpening] = useState(false);
  const [openingOfficial, setOpeningOfficial] = useState('');
  const [openingOffline, setOpeningOffline] = useState('');
  const [openingBusy, setOpeningBusy] = useState(false);
  const [openingError, setOpeningError] = useState<string | null>(null);
  const owner = isOwner();

  const load = useCallback(async () => {
    try {
      setError(null);
      setAccount(await accountsApi.getAccount(partyId, floor));
    } catch (err) {
      setError(errorMessage(err, 'Could not load this party. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [partyId, floor]);

  useEffect(() => {
    load();
  }, [load]);

  // Escape closes the panel when nothing is open on top of it
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !receiving && !statementOpen && !deleting && !editingOpening) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [receiving, statementOpen, deleting, editingOpening, onClose]);

  const changed = async (message: string) => {
    setNotice(message);
    await load();
    onChanged?.();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      setDeleteBusy(true);
      setDeleteError(null);
      await accountsApi.deleteReceipt(deleting.id);
      setDeleting(null);
      await changed(`Payment of ${formatMoney(deleting.amount)} deleted. Its amount is due again.`);
    } catch (err) {
      setDeleteError(errorMessage(err, 'Could not delete the payment. Please try again.'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const openOpeningEditor = () => {
    if (!account) return;
    setOpeningOfficial(String(account.summary.official.opening));
    setOpeningOffline(String(account.summary.offline.opening));
    setOpeningError(null);
    setEditingOpening(true);
  };

  const saveOpening = async () => {
    if (openingOfficial === '' || openingOffline === '') {
      setOpeningError('Enter both amounts (0 if none).');
      return;
    }
    try {
      setOpeningBusy(true);
      setOpeningError(null);
      await accountsApi.setOpeningBalance(partyId, Number(openingOfficial), Number(openingOffline));
      setEditingOpening(false);
      await changed('Opening balance saved.');
    } catch (err) {
      setOpeningError(errorMessage(err, 'Could not save. Please try again.'));
    } finally {
      setOpeningBusy(false);
    }
  };

  const summary = account?.summary;
  const hasOpening = !!summary && (summary.official.opening !== 0 || summary.offline.opening !== 0);
  const floorLabel = floorName(floor || summary?.partyFloor);

  return (
    <>
      <div className="modal-overlay drawer-overlay" onClick={onClose}>
        <div className="party-account-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${partyName} account`}>
          <header className="pap-header">
            <div className="pap-title">
              <p className="pap-eyebrow">Party account{floorLabel ? ` · ${floorLabel}` : ''}</p>
              <h2>{summary?.partyName ?? partyName}</h2>
            </div>
            <button type="button" className="pap-close" onClick={onClose} aria-label="Close">✕</button>
          </header>

          <div className="pap-actions">
            <button
              type="button"
              className="pap-primary"
              onClick={() => setReceiving(true)}
              disabled={!summary || (summary.official.due <= 0 && summary.offline.due <= 0)}
              title={summary && summary.totalDue <= 0 ? 'Nothing is due' : undefined}
            >
              + Receive payment
            </button>
            <button type="button" className="pap-secondary" onClick={() => setStatementOpen(true)} disabled={!summary}>
              Download statement
            </button>
            {owner && (
              <button type="button" className="pap-secondary" onClick={openOpeningEditor} disabled={!summary}>
                Edit opening balance
              </button>
            )}
          </div>

          {notice && (
            <div className="pap-notice" role="status">
              {notice}
              <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">✕</button>
            </div>
          )}

          {loading ? (
            <Loading message="Loading account..." />
          ) : error || !account || !summary ? (
            <div className="pap-error">
              {error ?? 'Could not load this party.'}
              <button type="button" className="pap-secondary" onClick={() => { setLoading(true); load(); }}>Try again</button>
            </div>
          ) : (
            <>
              <section className="pap-balances" aria-label="Balance">
                {(['official', 'offline'] as const).map((side) => (
                  <div className="pap-balance" key={side}>
                    <span className="pap-balance-label">{side === 'official' ? 'Official due' : 'Offline due'}</span>
                    <span className={`pap-balance-value${summary[side].due > 0 ? ' due' : ''}`}>{formatMoney(summary[side].due)}</span>
                    <span className="pap-balance-sub">
                      Billed {formatMoney(summary[side].billed)} · Received {formatMoney(summary[side].received)}
                    </span>
                  </div>
                ))}
                <div className="pap-balance total">
                  <span className="pap-balance-label">Total due</span>
                  <span className={`pap-balance-value${summary.totalDue > 0 ? ' due' : ''}`}>{formatMoney(summary.totalDue)}</span>
                  <span className="pap-balance-sub">
                    Aaglu {formatMoney(summary.aagluDue)} · Chalu {formatMoney(summary.chaluDue)}
                  </span>
                </div>
              </section>

              {hasOpening && (
                <p className="pap-opening">
                  <strong>Opening balance</strong> (from before the ERP): Official {formatMoney(summary.official.opening)}
                  {summary.official.opening > 0 && ` (${formatMoney(summary.official.openingDue)} still due)`}
                  {' · '}Offline {formatMoney(summary.offline.opening)}
                  {summary.offline.opening > 0 && ` (${formatMoney(summary.offline.openingDue)} still due)`}
                </p>
              )}

              <div className="pap-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === 'payments'} className={tab === 'payments' ? 'active' : ''} onClick={() => setTab('payments')}>
                  Payments received <span className="pap-count">{account.receipts.length}</span>
                </button>
                <button type="button" role="tab" aria-selected={tab === 'orders'} className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>
                  Orders <span className="pap-count">{account.orders.length}</span>
                </button>
              </div>

              {tab === 'payments' ? (
                account.receipts.length === 0 ? (
                  <div className="pap-empty">
                    No payments recorded yet. Use <strong>Receive payment</strong> when {summary.partyName} pays.
                  </div>
                ) : (
                  <div className="pap-table-wrap">
                    <table className="pap-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Paid against</th>
                          <th className="num">Amount</th>
                          <th>Cleared</th>
                          <th>Note</th>
                          <th>Recorded by</th>
                          {owner && <th aria-label="Actions"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {account.receipts.map((r) => (
                          <tr key={r.id}>
                            <td className="nowrap">{formatDate(r.receivedDate)}</td>
                            <td><span className={`pap-mode ${r.mode === 'OFFICIAL' ? 'official' : 'offline'}`}>{r.mode === 'OFFICIAL' ? 'Official' : 'Offline'}</span></td>
                            <td className="num strong">{formatMoney(r.amount)}</td>
                            <td className="pap-cleared">
                              {paidTowards(r).map((line) => <div key={line}>{line}</div>)}
                            </td>
                            <td className="pap-note">{r.note || '—'}</td>
                            <td className="pap-by" title={r.recordedAt ? `Recorded ${formatDate(r.recordedAt)}` : undefined}>
                              {r.recordedBy ? r.recordedBy.split('@')[0] : '—'}
                            </td>
                            {owner && (
                              <td>
                                <button
                                  type="button"
                                  className="pap-row-delete"
                                  onClick={() => { setDeleting(r); setDeleteError(null); }}
                                  title="Delete this payment (entered by mistake)"
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : account.orders.length === 0 && !hasOpening ? (
                <div className="pap-empty">No orders yet.</div>
              ) : (
                <div className="pap-table-wrap">
                  <table className="pap-table">
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Dispatch date</th>
                        <th className="num">Official</th>
                        <th className="num">Offline</th>
                        <th className="num">Still due</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {account.orders.map((o) => {
                        const status = orderStatus(o);
                        const due = Math.max(0, o.official.due) + Math.max(0, o.offline.due);
                        const open = expandedOrder === o.orderId;
                        return (
                          <React.Fragment key={o.orderId}>
                            <tr className="pap-order-row" onClick={() => setExpandedOrder(open ? null : o.orderId)}>
                              <td className="nowrap">
                                <span className={`pap-chevron${open ? ' open' : ''}`} aria-hidden="true">›</span>
                                #{o.orderId}
                                {!floor && floorName(o.floor) && <span className="pap-floor-tag">{floorName(o.floor)}</span>}
                              </td>
                              <td
                                className="nowrap"
                                title={o.dispatchDate ? `Ordered ${formatDate(o.orderDate)}` : 'Dispatch date not recorded; showing order date'}
                              >
                                {formatDate(o.dispatchDate || o.orderDate)}
                              </td>
                              <td className="num" title={`Received ${formatMoney(o.official.received)}`}>{formatMoney(o.official.total)}</td>
                              <td className="num" title={`Received ${formatMoney(o.offline.received)}`}>{formatMoney(o.offline.total)}</td>
                              <td className={`num${due > 0 ? ' due' : ''}`}>{formatMoney(due)}</td>
                              <td><span className={`pap-status ${status.tone}`}>{status.label}</span></td>
                            </tr>
                            {open && (
                              <tr className="pap-order-detail">
                                <td colSpan={6}>
                                  <div className="pap-order-sides">
                                    <span>Official: received {formatMoney(o.official.received)} of {formatMoney(o.official.total)}, {formatMoney(o.official.due)} due</span>
                                    <span>Offline: received {formatMoney(o.offline.received)} of {formatMoney(o.offline.total)}, {formatMoney(o.offline.due)} due</span>
                                  </div>
                                  {o.products.length > 0 && (
                                    <table className="pap-products">
                                      <thead>
                                        <tr><th>Product</th><th className="num">Qty (kg)</th><th className="num">Qty (pc)</th><th className="num">Rate</th><th className="num">Amount</th></tr>
                                      </thead>
                                      <tbody>
                                        {o.products.map((p) => (
                                          <tr key={p.id}>
                                            <td>{p.productName}</td>
                                            <td className="num">{p.quantityKg || '—'}</td>
                                            <td className="num">{p.quantityPc || '—'}</td>
                                            <td className="num">{formatMoney(p.marketRate)}</td>
                                            <td className="num">{formatMoney(p.totalAmount)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {hasOpening && (
                        <tr className="pap-opening-row">
                          <td colSpan={2}>Opening balance</td>
                          <td className="num">{formatMoney(summary.official.opening)}</td>
                          <td className="num">{formatMoney(summary.offline.opening)}</td>
                          <td className={`num${summary.official.openingDue + summary.offline.openingDue > 0 ? ' due' : ''}`}>
                            {formatMoney(Math.max(0, summary.official.openingDue) + Math.max(0, summary.offline.openingDue))}
                          </td>
                          <td>
                            {(() => {
                              const due = Math.max(0, summary.official.openingDue) + Math.max(0, summary.offline.openingDue);
                              const total = summary.official.opening + summary.offline.opening;
                              const tone = due <= 0.004 ? 'paid' : due < total ? 'part' : 'unpaid';
                              return <span className={`pap-status ${tone}`}>{tone === 'paid' ? 'Paid' : tone === 'part' ? 'Part paid' : 'Unpaid'}</span>;
                            })()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {receiving && account && (
        <ReceivePaymentModal
          account={account}
          floor={floor}
          initialMode={receiving === true ? undefined : receiving}
          onClose={() => setReceiving(false)}
          onSaved={async (receipt) => {
            setReceiving(false);
            setTab('payments');
            await changed(`${formatMoney(receipt.amount)} received on ${formatDate(receipt.receivedDate)} recorded.`);
          }}
        />
      )}

      {statementOpen && (
        <StatementDownloadModal
          party={{ partyId, name: summary?.partyName ?? partyName }}
          floor={floor}
          onClose={() => setStatementOpen(false)}
        />
      )}

      {deleting && (
        <div className="modal-overlay pap-dialog-overlay" onClick={() => !deleteBusy && setDeleting(null)}>
          <div className="modal-content small-modal pap-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Delete this payment?</h2>
            <p>
              {formatMoney(deleting.amount)} {deleting.mode === 'OFFICIAL' ? 'Official' : 'Offline'} received on {formatDate(deleting.receivedDate)}
              {deleting.note ? ` (${deleting.note})` : ''}. What it cleared will be due again. This cannot be undone.
            </p>
            {deleteError && <div className="pap-dialog-error">{deleteError}</div>}
            <div className="modal-actions">
              <button type="button" className="pap-danger" onClick={confirmDelete} disabled={deleteBusy}>
                {deleteBusy ? 'Deleting…' : 'Delete payment'}
              </button>
              <button type="button" className="cancel-button" onClick={() => setDeleting(null)} disabled={deleteBusy}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editingOpening && (
        <div className="modal-overlay pap-dialog-overlay" onClick={() => !openingBusy && setEditingOpening(false)}>
          <div className="modal-content small-modal pap-dialog" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Opening balance</h2>
            <p>What {summary?.partyName} owed before using the ERP. Orders are added on top automatically.</p>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="opening-official">Official</label>
                <input id="opening-official" type="number" step="0.01" className="form-input" value={openingOfficial} onChange={(e) => setOpeningOfficial(e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="opening-offline">Offline</label>
                <input id="opening-offline" type="number" step="0.01" className="form-input" value={openingOffline} onChange={(e) => setOpeningOffline(e.target.value)} />
              </div>
            </div>
            {openingError && <div className="pap-dialog-error">{openingError}</div>}
            <div className="modal-actions">
              <button type="button" className="save-button" onClick={saveOpening} disabled={openingBusy}>
                {openingBusy ? 'Saving…' : 'Save'}
              </button>
              <button type="button" className="cancel-button" onClick={() => setEditingOpening(false)} disabled={openingBusy}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PartyAccountPanel;
