import React, { useState, useEffect } from 'react';
import { subcontractingApi } from '../api/subcontracting';
import type {
  SubcontractingBySubcontractList,
  SubcontractSentEntry,
  SubcontractReturnEntry,
} from '../types';
import Loading from './Loading';
import './SubcontractViewModal.css';
import DateInput from './DateInput';

interface SubcontractViewModalProps {
  contractorName: string;
  onClose: () => void;
}

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatCurrency = (amount?: number | null) => {
  if (amount === undefined || amount === null) return '-';
  return `₹ ${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatNumber = (num?: number | null, suffix?: string) => {
  if (num === undefined || num === null) return '-';
  const formatted = num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return suffix ? `${formatted}${suffix}` : formatted;
};

const monthKey = (date?: string | null) => (date ? date.slice(0, 7) : '');
const monthLabel = (key: string) => {
  if (!key) return 'No date';
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

/** Rows already sorted by date, split into their months */
const byMonth = <T extends { date: string }>(rows: T[]): { key: string; rows: T[] }[] => {
  const groups: { key: string; rows: T[] }[] = [];
  rows.forEach((row) => {
    const key = monthKey(row.date);
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.rows.push(row);
    else groups.push({ key, rows: [row] });
  });
  return groups;
};

const sum = <T,>(rows: T[], pick: (row: T) => number) => rows.reduce((total, row) => total + (pick(row) || 0), 0);

const SubcontractViewModal: React.FC<SubcontractViewModalProps> = ({
  contractorName,
  onClose,
}) => {
  const [data, setData] = useState<SubcontractingBySubcontractList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    date.setDate(0);
    return date.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractorName, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await subcontractingApi.getSubcontractByCustomerName(
        contractorName,
        startDate,
        endDate
      );
      setData(response);
    } catch (err: any) {
      console.error('Error fetching subcontract details:', err);
      setError(err.response?.data?.message || 'Failed to load subcontract details');
    } finally {
      setLoading(false);
    }
  };

  const sent: SubcontractSentEntry[] = data?.sentEntries ?? [];
  const returns: SubcontractReturnEntry[] = data?.returnEntries ?? [];
  const sentMonths = byMonth(sent);
  const returnMonths = byMonth(returns);
  // A rejection set by hand on the job work is not on any one return; it shows in the totals
  const showRejection = returns.some((r) => (r.rejectionStock || 0) > 0);

  return (
    <div className="subcontract-view-modal-overlay" onClick={onClose}>
      <div className="subcontract-view-modal" onClick={(e) => e.stopPropagation()}>
        <div className="subcontract-view-header">
          <div className="subcontract-view-title-section">
            <h2 className="subcontract-view-title">{contractorName}</h2>
            <p className="subcontract-view-date-range">
              Date Range :- {formatDate(startDate)} - {formatDate(endDate)}
            </p>
          </div>
          <button type="button" className="subcontract-view-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="subcontract-view-date-filters">
          <div className="date-filter-group">
            <label>Start Date:</label>
            <DateInput
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="date-filter-group">
            <label>End Date:</label>
            <DateInput
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="subcontract-view-content">
          {loading ? (
            <Loading message="Loading details..." size="medium" />
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : !data || (sent.length === 0 && returns.length === 0) ? (
            <div className="no-data">Nothing was sent or returned in the selected date range.</div>
          ) : (
            <>
              <div className="subcontract-view-totals subcontract-view-totals-top">
                <div className="totals-row totals-row-money">
                  <div className="total-item total-paid">
                    <span className="total-label">Total Sent Value :-</span>
                    <span className="total-value">{formatCurrency(data.totalPaidRs)}/-</span>
                  </div>
                  {(data.totalRejectionAmount || 0) > 0 && (
                    <div className="total-item total-paid">
                      <span className="total-label">Rejection Deducted :-</span>
                      <span className="total-value highlight-red">{formatCurrency(data.totalRejectionAmount || 0)}/-</span>
                    </div>
                  )}
                  <div className="total-item total-paid">
                    <span className="total-label">Total Job Pay :-</span>
                    <span className="total-value">{formatCurrency(data.totalJobPaidAmount)}/-</span>
                  </div>
                </div>
                <div className="totals-row">
                  <div className="total-item">
                    <span className="total-label">Total Sent Stock :-</span>
                    <span className="total-value">{formatNumber(data.totalSentStock, ' kg')}</span>
                  </div>
                  <div className="total-item">
                    <span className="total-label">Total Return Stock :-</span>
                    <span className="total-value">{formatNumber(data.totalReturnStock, ' kg')}</span>
                  </div>
                  <div className="total-item">
                    <span className="total-label">Net Return :-</span>
                    <span className="total-value">{formatNumber(data.totalNetReturnStock, ' kg')}</span>
                  </div>
                  {(data.totalRejectionStock || 0) > 0 && (
                    <div className="total-item">
                      <span className="total-label">Total Rejection :-</span>
                      <span className="total-value">{formatNumber(data.totalRejectionStock || 0, ' kg')}</span>
                    </div>
                  )}
                  <div className="total-item total-used">
                    <span className="total-label">Total Used :-</span>
                    <span className="total-value highlight-red">{formatNumber(data.totalUsed, ' kg')}</span>
                  </div>
                  {data.totalElements && (
                    <div className="total-item">
                      <span className="total-label">Total Element :-</span>
                      <span className="total-value">{data.totalElements}</span>
                    </div>
                  )}
                </div>
              </div>

              <h3 className="subcontract-section-title">
                Sent <span className="subcontract-section-count">{sent.length} {sent.length === 1 ? 'entry' : 'entries'}</span>
              </h3>
              {sent.length === 0 ? (
                <div className="no-data no-data-small">Nothing was sent in this date range.</div>
              ) : (
                <div className="subcontract-table-wrapper">
                  <table className="subcontract-detail-table subcontract-entries-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Item</th>
                        <th className="num">Sent Stock</th>
                        <th className="num">Market</th>
                        <th className="num">Job Work</th>
                        <th className="num">Value</th>
                        <th className="num">Job Pay</th>
                        <th>Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentMonths.map((month) => (
                        <React.Fragment key={month.key}>
                          {month.rows.map((row, index) => (
                            <tr key={`${month.key}-${index}`}>
                              <td>{formatDate(row.date)}</td>
                              <td>{row.itemName || '-'}</td>
                              <td className="num">{formatNumber(row.sentStock, ' kg')}</td>
                              <td className="num">{formatCurrency(row.price)}</td>
                              <td className="num">{formatNumber(row.jobWorkPay)}</td>
                              <td className="num">{formatCurrency(row.value)}</td>
                              <td className="num">{formatCurrency(row.jobPay)}</td>
                              <td className="remark-cell">{row.remark || '-'}</td>
                            </tr>
                          ))}
                          {sentMonths.length > 1 && (
                            <tr className="month-total-row">
                              <td colSpan={2}>{monthLabel(month.key)} total</td>
                              <td className="num">{formatNumber(sum(month.rows, (r) => r.sentStock), ' kg')}</td>
                              <td />
                              <td />
                              <td className="num">{formatCurrency(sum(month.rows, (r) => r.value))}</td>
                              <td className="num">{formatCurrency(sum(month.rows, (r) => r.jobPay))}</td>
                              <td />
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      <tr className="grand-total-row">
                        <td colSpan={2}>Total sent</td>
                        <td className="num">{formatNumber(sum(sent, (r) => r.sentStock), ' kg')}</td>
                        <td />
                        <td />
                        <td className="num">{formatCurrency(sum(sent, (r) => r.value))}</td>
                        <td className="num">{formatCurrency(sum(sent, (r) => r.jobPay))}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              <h3 className="subcontract-section-title">
                Returned <span className="subcontract-section-count">{returns.length} {returns.length === 1 ? 'entry' : 'entries'}</span>
              </h3>
              {returns.length === 0 ? (
                <div className="no-data no-data-small">Nothing was returned in this date range.</div>
              ) : (
                <div className="subcontract-table-wrapper">
                  <table className="subcontract-detail-table subcontract-entries-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Item</th>
                        <th className="num">Rt. Stock</th>
                        <th>Element</th>
                        {showRejection && <th className="num">Rejection</th>}
                        <th className="num">Net Wgt.</th>
                        <th>Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnMonths.map((month) => (
                        <React.Fragment key={month.key}>
                          {month.rows.map((row, index) => (
                            <tr key={`${month.key}-${index}`}>
                              <td>{formatDate(row.date)}</td>
                              <td>{row.itemName || '-'}</td>
                              <td className="num">{formatNumber(row.grossStock, ' kg')}</td>
                              <td>{row.elements || '-'}</td>
                              {showRejection && (
                                <td className="num">{row.rejectionStock ? formatNumber(row.rejectionStock, ' kg') : '-'}</td>
                              )}
                              <td className="num net-weight-cell">{formatNumber(row.netStock, ' kg')}</td>
                              <td className="remark-cell">{row.remark || '-'}</td>
                            </tr>
                          ))}
                          {returnMonths.length > 1 && (
                            <tr className="month-total-row">
                              <td colSpan={2}>{monthLabel(month.key)} total</td>
                              <td className="num">{formatNumber(sum(month.rows, (r) => r.grossStock), ' kg')}</td>
                              <td />
                              {showRejection && (
                                <td className="num">{formatNumber(sum(month.rows, (r) => r.rejectionStock), ' kg')}</td>
                              )}
                              <td className="num">{formatNumber(sum(month.rows, (r) => r.netStock), ' kg')}</td>
                              <td />
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                      <tr className="grand-total-row">
                        <td colSpan={2}>Total returned</td>
                        <td className="num">{formatNumber(sum(returns, (r) => r.grossStock), ' kg')}</td>
                        <td />
                        {showRejection && (
                          <td className="num">{formatNumber(sum(returns, (r) => r.rejectionStock), ' kg')}</td>
                        )}
                        <td className="num">{formatNumber(sum(returns, (r) => r.netStock), ' kg')}</td>
                        <td />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubcontractViewModal;
