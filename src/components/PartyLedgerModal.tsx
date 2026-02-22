import React, { useState, useCallback, useEffect, useRef } from 'react';
import { paymentApi } from '../api/payment';
import type { PartyLedgerResponse, Payment, PaymentFloor, BillingType } from '../types';
import PaymentReceivedModal from './PaymentReceivedModal';
import './PartyLedgerModal.css';

interface PartyLedgerModalProps {
  ledger: PartyLedgerResponse;
  floor?: PaymentFloor;
  onClose: () => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const currency = (value?: number | null) => {
  if (value === null || value === undefined) return '₹ 0';
  return `₹ ${value.toLocaleString('en-IN')}`;
};

const getDefaultDates = () => {
  const today = new Date();
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  return {
    start: oneYearAgo.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0],
  };
};

const PartyLedgerModal: React.FC<PartyLedgerModalProps> = ({ ledger: initialLedger, floor, onClose }) => {
  const defaults = getDefaultDates();
  const [startDate, setStartDate] = useState(defaults.start);
  const [endDate, setEndDate] = useState(defaults.end);
  const [ledger, setLedger] = useState<PartyLedgerResponse>(initialLedger);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Record payment state
  const [recordingPayment, setRecordingPayment] = useState<Payment | null>(null);
  const [paymentFetchError, setPaymentFetchError] = useState<string | null>(null);

  // Pre-fetch all payments for this floor on open, keyed by "orderId-mode".
  // We avoid the `search` query param entirely because the backend has a bug:
  // searching by a numeric order ID crashes with InvalidDataAccessApiUsageException
  // because it also tries to filter by `customerName` which doesn't exist on OrderReplica.
  const paymentsMap = useRef<Map<string, Payment>>(new Map());
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);

  useEffect(() => {
    if (!floor) return;
    let cancelled = false;

    const loadPayments = async () => {
      try {
        // Fetch a large page to cover all payments for this floor.
        // No search param — avoids the backend bug.
        const result = await paymentApi.getPaymentList({ floor, size: 500 });
        if (cancelled) return;
        const map = new Map<string, Payment>();
        result.data.forEach((p) => {
          const mode = p.mode ?? 'OFFICIAL';
          map.set(`${p.orderId}-${mode}`, p);
        });
        paymentsMap.current = map;
        setPaymentsLoaded(true);
      } catch (err) {
        // Non-fatal — buttons will show an error if user clicks before load
        console.error('Failed to pre-fetch payments', err);
        setPaymentsLoaded(true); // still mark loaded so buttons become active
      }
    };

    loadPayments();
    return () => { cancelled = true; };
  }, [floor]);

  const fetchLedger = useCallback(async (start: string, end: string) => {
    try {
      setFetching(true);
      setFetchError(null);
      const result = await paymentApi.getPartyLedger(initialLedger.partyId, start, end);
      setLedger(result);
    } catch (err) {
      console.error('Failed to fetch ledger', err);
      setFetchError('Failed to load ledger data for the selected dates.');
    } finally {
      setFetching(false);
    }
  }, [initialLedger.partyId]);

  const handleApplyFilter = () => {
    fetchLedger(startDate, endDate);
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      setDownloadError(null);
      const blob = await paymentApi.getPartyLedgerPdf(ledger.partyId, startDate, endDate);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `party-ledger-${ledger.partyName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF', err);
      setDownloadError('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const handleRecordPayment = (orderId: number, mode: BillingType) => {
    if (!floor) return;
    const key = `${orderId}-${mode}`;
    setPaymentFetchError(null);

    if (!paymentsLoaded) {
      setPaymentFetchError('Payments are still loading, please wait a moment.');
      return;
    }

    const match = paymentsMap.current.get(key);
    if (match) {
      setRecordingPayment(match);
    } else {
      setPaymentFetchError(
        `No ${mode.toLowerCase()} payment record found for Order #${orderId}. It may have already been settled.`
      );
    }
  };

  const handlePaymentSuccess = () => {
    setRecordingPayment(null);
    // Reload cached payments so updated amounts are reflected on next click
    if (floor) {
      paymentApi.getPaymentList({ floor, size: 500 }).then((result) => {
        const map = new Map<string, Payment>();
        result.data.forEach((p) => {
          const mode = p.mode ?? 'OFFICIAL';
          map.set(`${p.orderId}-${mode}`, p);
        });
        paymentsMap.current = map;
      }).catch(() => { });
    }
    // Refresh the ledger to show updated amounts
    fetchLedger(startDate, endDate);
  };

  const anyError = fetchError || downloadError || paymentFetchError;

  return (
    <>
      <div className="ledger-overlay" onClick={onClose}>
        <div className="ledger-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="ledger-header">
            <div>
              <p className="ledger-subtitle">Party Ledger</p>
              <h2 className="ledger-title">{ledger.partyName}</h2>
            </div>
            <div className="ledger-header-actions">
              <button
                type="button"
                className="ledger-download-btn"
                onClick={handleDownloadPdf}
                disabled={downloading || fetching}
              >
                {downloading ? 'Downloading...' : 'Download PDF'}
                {!downloading && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
              </button>
              <button type="button" className="ledger-close" onClick={onClose} aria-label="Close">
                ✕
              </button>
            </div>
          </div>

          {/* Date filter bar */}
          <div className="ledger-filters">
            <div className="ledger-date-group">
              <label htmlFor="ledger-start-date">Start Date</label>
              <input
                id="ledger-start-date"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="ledger-date-group">
              <label htmlFor="ledger-end-date">End Date</label>
              <input
                id="ledger-end-date"
                type="date"
                value={endDate}
                min={startDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="ledger-apply-btn"
              onClick={handleApplyFilter}
              disabled={fetching}
            >
              {fetching ? (
                <span className="ledger-spinner" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              )}
              {fetching ? 'Loading...' : 'Apply'}
            </button>
          </div>

          {anyError && (
            <div className="ledger-error-bar" onClick={() => { setFetchError(null); setDownloadError(null); setPaymentFetchError(null); }}>
              {anyError}
              <span className="ledger-error-dismiss">✕</span>
            </div>
          )}

          {/* Summary cards */}
          <div className="ledger-summary">
            <div className="ledger-summary-card">
              <span className="ledger-summary-label">Total Official</span>
              <span className="ledger-summary-value">{currency(ledger.totalOfficialAmount)}</span>
            </div>
            <div className="ledger-summary-card">
              <span className="ledger-summary-label">Total Offline</span>
              <span className="ledger-summary-value">{currency(ledger.totalOfflineAmount)}</span>
            </div>
            <div className="ledger-summary-card">
              <span className="ledger-summary-label">Total Received</span>
              <span className="ledger-summary-value">{currency(ledger.totalReceivedAmount)}</span>
            </div>
            <div className="ledger-summary-card highlight">
              <span className="ledger-summary-label">Total Remaining</span>
              <span className="ledger-summary-value">{currency(ledger.totalRemainingAmount)}</span>
            </div>
          </div>

          {/* Orders */}
          <div className="ledger-body">
            {fetching ? (
              <div className="ledger-loading">
                <span className="ledger-spinner ledger-spinner-lg" />
                <span>Loading...</span>
              </div>
            ) : ledger.orders.length === 0 ? (
              <div className="ledger-empty">No orders found for the selected date range.</div>
            ) : (
              <div className="ledger-orders">
                {ledger.orders.map((order) => {
                  const officialDue = order.paymentSummary?.official?.dueAmount ?? 0;
                  const offlineDue = order.paymentSummary?.offline?.dueAmount ?? 0;

                  return (
                    <div className="ledger-order-card" key={order.orderId}>
                      {/* Order header */}
                      <div className="ledger-order-header">
                        <div className="ledger-order-header-left">
                          <span className="ledger-order-id">Order #{order.orderId}</span>
                          <span className="ledger-order-date">{formatDate(order.orderDate)}</span>
                        </div>

                        {/* Record Payment buttons — only if floor is known and due > 0 */}
                        {floor && (officialDue > 0 || offlineDue > 0) && (
                          <div className="ledger-payment-actions">
                            {officialDue > 0 && (
                              <button
                                type="button"
                                className="ledger-record-btn ledger-record-btn--official"
                                disabled={!paymentsLoaded}
                                onClick={() => handleRecordPayment(order.orderId, 'OFFICIAL')}
                                title={`Record official payment (Due: ${currency(officialDue)})`}
                              >
                                {!paymentsLoaded ? (
                                  <span className="ledger-spinner ledger-spinner--dark" />
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="16" />
                                    <line x1="8" y1="12" x2="16" y2="12" />
                                  </svg>
                                )}
                                Official Due: {currency(officialDue)}
                              </button>
                            )}
                            {offlineDue > 0 && (
                              <button
                                type="button"
                                className="ledger-record-btn ledger-record-btn--offline"
                                disabled={!paymentsLoaded}
                                onClick={() => handleRecordPayment(order.orderId, 'OFFLINE')}
                                title={`Record offline payment (Due: ${currency(offlineDue)})`}
                              >
                                {!paymentsLoaded ? (
                                  <span className="ledger-spinner ledger-spinner--dark" />
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <line x1="12" y1="8" x2="12" y2="16" />
                                    <line x1="8" y1="12" x2="16" y2="12" />
                                  </svg>
                                )}
                                Offline Due: {currency(offlineDue)}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Products table */}
                      {order.products && order.products.length > 0 && (
                        <table className="ledger-products-table">
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
                                <td>{currency(p.marketRate)}</td>
                                <td>{currency(p.rateDifference)}</td>
                                <td>{currency(p.totalAmount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Bill & Payment summary */}
                      <div className="ledger-order-footer">
                        <div className="ledger-bill-section">
                          <span className="ledger-section-title">Bill Summary</span>
                          <div className="ledger-detail-grid">
                            <div>
                              <span className="ledger-detail-label">Bill %</span>
                              <span className="ledger-detail-value">{order.billSummary?.billPercentage ?? '—'}%</span>
                            </div>
                            <div>
                              <span className="ledger-detail-label">Without GST</span>
                              <span className="ledger-detail-value">{currency(order.billSummary?.amountWithoutGst)}</span>
                            </div>
                            <div>
                              <span className="ledger-detail-label">GST</span>
                              <span className="ledger-detail-value">{currency(order.billSummary?.gstAmount)}</span>
                            </div>
                            <div>
                              <span className="ledger-detail-label">Bill Total</span>
                              <span className="ledger-detail-value">{currency(order.billSummary?.billTotalAmount)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="ledger-payment-section">
                          <span className="ledger-section-title">Payment Summary</span>
                          <div className="ledger-payment-sides">
                            <div className="ledger-payment-side">
                              <span className="ledger-side-label">Official</span>
                              <div className="ledger-detail-grid">
                                <div>
                                  <span className="ledger-detail-label">Total</span>
                                  <span className="ledger-detail-value">{currency(order.paymentSummary?.official?.totalAmount)}</span>
                                </div>
                                <div>
                                  <span className="ledger-detail-label">Received</span>
                                  <span className="ledger-detail-value">{currency(order.paymentSummary?.official?.receivedAmount)}</span>
                                </div>
                                <div>
                                  <span className="ledger-detail-label">Due</span>
                                  <span className={`ledger-detail-value ${officialDue > 0 ? 'ledger-due-amount' : ''}`}>
                                    {currency(order.paymentSummary?.official?.dueAmount)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="ledger-payment-side">
                              <span className="ledger-side-label">Offline</span>
                              <div className="ledger-detail-grid">
                                <div>
                                  <span className="ledger-detail-label">Total</span>
                                  <span className="ledger-detail-value">{currency(order.paymentSummary?.offline?.totalAmount)}</span>
                                </div>
                                <div>
                                  <span className="ledger-detail-label">Received</span>
                                  <span className="ledger-detail-value">{currency(order.paymentSummary?.offline?.receivedAmount)}</span>
                                </div>
                                <div>
                                  <span className="ledger-detail-label">Due</span>
                                  <span className={`ledger-detail-value ${offlineDue > 0 ? 'ledger-due-amount' : ''}`}>
                                    {currency(order.paymentSummary?.offline?.dueAmount)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="ledger-order-totals">
                        <div>
                          <span className="ledger-detail-label">Official Grand Total</span>
                          <span className="ledger-detail-value">{currency(order.officialGrandTotal)}</span>
                        </div>
                        <div>
                          <span className="ledger-detail-label">Offline Grand Total</span>
                          <span className="ledger-detail-value">{currency(order.offlineGrandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Payment modal — renders above ledger overlay */}
      {recordingPayment && (
        <PaymentReceivedModal
          payment={recordingPayment}
          onClose={() => setRecordingPayment(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
};

export default PartyLedgerModal;
