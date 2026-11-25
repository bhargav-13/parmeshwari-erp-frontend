import React, { useEffect, useState } from 'react';
import { stockHistoryApi, type StockHistoryRow } from '../api/stockHistory';
import { formatQty } from '../utils/format';
import './StockHistoryModal.css';

interface StockHistoryModalProps {
  onClose: () => void;
  /** History of one stock item; leave out to see every change on the floor */
  stockItemId?: number;
  itemName?: string;
  floor?: string;
}

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  DISPATCH: 'Dispatch',
  REVOKE: 'Dispatch revoked',
  PURCHASE: 'Purchase',
  PURCHASE_DELETED: 'Purchase deleted',
  CROME_RETURN: 'Crome return',
  CROME_RETURN_DELETED: 'Crome return deleted',
  FORGING: 'Forging',
  REJECTION: 'Rejection',
  EDIT: 'Edited',
  CREATED: 'Item added',
  DELETED: 'Item deleted',
  CORRECTION: 'Correction',
  CHANGE: 'Changed',
};

// 2026-11-25T16:05:00 -> 25/11/2026 04:05 PM (the server already stores India time)
const formatDateTime = (value: string | null): string => {
  const m = value ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value) : null;
  if (!m) return value || '—';
  const hour = Number(m[4]);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${m[3]}/${m[2]}/${m[1]} ${String(hour12).padStart(2, '0')}:${m[5]} ${hour < 12 ? 'AM' : 'PM'}`;
};

const formatPcs = (value: number | null): string =>
  value == null ? '—' : Math.round(value).toLocaleString('en-IN');

const formatKg = (value: number | null): string => (value == null ? '—' : formatQty(value));

const Diff: React.FC<{ before: number | null; after: number | null; decimals: number }> = ({
  before,
  after,
  decimals,
}) => {
  const diff = (after ?? 0) - (before ?? 0);
  if (Math.abs(diff) < 0.0005) return <span className="stock-history-diff none">—</span>;
  const text = Number(Math.abs(diff).toFixed(decimals)).toLocaleString('en-IN');
  return (
    <span className={`stock-history-diff ${diff < 0 ? 'down' : 'up'}`}>
      {diff < 0 ? '−' : '+'}
      {text}
    </span>
  );
};

const StockHistoryModal: React.FC<StockHistoryModalProps> = ({ onClose, stockItemId, itemName, floor }) => {
  const [rows, setRows] = useState<StockHistoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedSearch(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    stockHistoryApi
      .getHistory({
        itemId: stockItemId,
        floor: stockItemId ? undefined : floor,
        search: stockItemId ? undefined : appliedSearch || undefined,
        page,
        size: PAGE_SIZE,
      })
      .then((result) => {
        if (cancelled) return;
        setRows(result.data || []);
        setTotal(result.totalElements || 0);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || 'Could not load the stock history.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stockItemId, floor, appliedSearch, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="modal-overlay drawer-overlay" onClick={onClose}>
      <div className="modal-content stock-history-modal" onClick={(e) => e.stopPropagation()}>
        <div className="stock-history-header">
          <div>
            <h2 className="modal-title">Stock History</h2>
            <p className="stock-history-subtitle">
              {stockItemId ? itemName || 'This item' : 'Every change to stock, newest first'}
            </p>
          </div>
          <button type="button" className="stock-history-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {!stockItemId && (
          <input
            type="search"
            className="stock-history-search"
            placeholder="Search by product name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search stock history by product name"
          />
        )}

        {error && <div className="error-message">{error}</div>}

        <div className="stock-history-table-wrap">
          <table className="stock-history-table">
            <thead>
              <tr>
                <th>Date &amp; time</th>
                {!stockItemId && <th>Product</th>}
                <th>What happened</th>
                <th className="num">Kg: before → after</th>
                <th className="num">Kg change</th>
                <th className="num">Pcs: before → after</th>
                <th className="num">Pcs change</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={stockItemId ? 7 : 8} className="stock-history-empty">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={stockItemId ? 7 : 8} className="stock-history-empty">
                    No stock changes recorded yet. Changes are recorded from 25 Nov 2026 onward.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((row) => (
                  <tr key={row.id}>
                    <td className="nowrap">{formatDateTime(row.createdAt)}</td>
                    {!stockItemId && <td className="stock-history-product">{row.productName || `Item #${row.stockItemId ?? '—'}`}</td>}
                    <td>
                      <span className={`stock-history-action ${row.action.toLowerCase()}`}>
                        {ACTION_LABELS[row.action] || row.action}
                      </span>
                      {row.note && <span className="stock-history-note">{row.note}</span>}
                    </td>
                    <td className="num">
                      {formatKg(row.kgBefore)} <span className="stock-history-arrow">→</span> {formatKg(row.kgAfter)}
                    </td>
                    <td className="num">
                      <Diff before={row.kgBefore} after={row.kgAfter} decimals={3} />
                    </td>
                    <td className="num">
                      {formatPcs(row.pcBefore)} <span className="stock-history-arrow">→</span> {formatPcs(row.pcAfter)}
                    </td>
                    <td className="num">
                      <Diff before={row.pcBefore} after={row.pcAfter} decimals={0} />
                    </td>
                    <td>{row.changedBy || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="stock-history-footer">
          <span>
            {total.toLocaleString('en-IN')} change{total === 1 ? '' : 's'}
          </span>
          {totalPages > 1 && (
            <div className="stock-history-pager">
              <button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
                Previous
              </button>
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockHistoryModal;
