import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { subcontractingApi } from '../api/subcontracting';
import type { Subcontracting, SubRejectionRequest } from '../types';
import Loading from '../components/Loading';
import RejectionModal from '../components/RejectionModal';
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import { formatQty } from '../utils/format';
import './SubcontractingPage.css';
import './SubcontractPage.css';

// One job work with rejected material
interface RejectionRow {
  subcontract: Subcontracting;
  contractorName: string;
  itemName: string;
  orderDate: string; // yyyy-mm-dd
  returnRejections: number[]; // rejection kg on each return
  returnsTotal: number;
  rejection: number; // in effect: set by hand, else the returns' total
  manual: boolean;
  rate: number;
  amount: number;
}

const toRow = (s: Subcontracting): RejectionRow => {
  const returnRejections = (s.subReturns || []).map((r) => r.rejectionStock || 0).filter((kg) => kg > 0);
  const returnsTotal = s.returnsRejectionStock ?? returnRejections.reduce((a, b) => a + b, 0);
  const rejection = s.rejectionStock ?? returnsTotal;
  const rate = s.rejectionPrice ?? s.price ?? 0;
  return {
    subcontract: s,
    contractorName: s.contractor?.name || '-',
    itemName: s.item?.name || '-',
    orderDate: (s.orderDate || '').slice(0, 10),
    returnRejections,
    returnsTotal,
    rejection,
    manual: !!s.rejectionStockManual,
    rate,
    amount: s.rejectionAmount ?? rejection * rate,
  };
};

const formatMoney = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SubcontractRejectionPage: React.FC = () => {
  const [rows, setRows] = useState<RejectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [contractorFilter, setContractorFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [editing, setEditing] = useState<Subcontracting | null>(null);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Every job work (all statuses) in one page; keep those with any rejection
      const response = await subcontractingApi.getSubcontractingList({ page: 0, size: 5000 });
      setRows(
        response.data
          .map(toRow)
          .filter((r) => r.rejection > 0 || r.returnsTotal > 0)
          .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
      );
    } catch (err) {
      console.error('Error fetching job work rejections:', err);
      setError('Failed to load rejections. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleSave = async (data: SubRejectionRequest) => {
    if (!editing) return;
    await subcontractingApi.updateRejection(editing.subcontractingId, data);
    setEditing(null);
    fetchRows();
  };

  const contractors = useMemo(
    () => Array.from(new Set(rows.map((r) => r.contractorName))).sort((a, b) => a.localeCompare(b)),
    [rows]
  );

  const filteredRows = rows.filter((r) => {
    if (contractorFilter && r.contractorName !== contractorFilter) return false;
    if (fromDate && r.orderDate < fromDate) return false;
    if (toDate && r.orderDate > toDate) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.contractorName.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        `pbi-${r.subcontract.subcontractingId}`.includes(q)
      );
    }
    return true;
  });

  const totalRejection = filteredRows.reduce((sum, r) => sum + r.rejection, 0);
  const totalAmount = filteredRows.reduce((sum, r) => sum + r.amount, 0);
  const hasFilters = searchQuery !== '' || contractorFilter !== '' || fromDate !== '' || toDate !== '';

  const formatDate = (iso: string) => (iso ? format(new Date(iso), 'dd-MM-yyyy') : '-');

  return (
    <div className="subcontract-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Job Work Rejection</h1>
          <p className="page-subtitle">Rejected material per job work; its value comes off the job pay</p>
        </div>
      </div>

      {error && <div className="rejection-error">{error}</div>}

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Rejection</span>
            <span className="stat-value">{formatQty(totalRejection)} Kg</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Deducted from Job Pay</span>
            <span className="stat-value">₹ {formatMoney(totalAmount)}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Job Works</span>
            <span className="stat-value">{filteredRows.length}</span>
          </div>
        </div>
      </div>

      <div className="subcontract-filters rejection-filters">
        <div className="subcontract-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search by subcontractor, item or job work no."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="subcontract-search-by">
          <select value={contractorFilter} onChange={(e) => setContractorFilter(e.target.value)} title="Filter by subcontractor">
            <option value="">All Subcontractors</option>
            {contractors.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="rejection-date-range" title="Order date">
          <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} title="Order date from" aria-label="Order date from" />
          <span>to</span>
          <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} title="Order date to" aria-label="Order date to" />
        </div>
        {hasFilters && (
          <button
            type="button"
            className="rejection-clear-btn"
            onClick={() => { setSearchQuery(''); setContractorFilter(''); setFromDate(''); setToDate(''); }}
          >
            Clear
          </button>
        )}
      </div>

      <div className="subcontract-table-container rejection-table-container">
        {loading ? (
          <Loading message="Loading rejections..." size="large" />
        ) : filteredRows.length === 0 ? (
          <div className="no-data">{rows.length === 0 ? 'No rejections recorded yet.' : 'No rejections match the filters.'}</div>
        ) : (
          <table className="subcontract-table">
            <thead>
              <tr>
                <th>Order Date</th>
                <th>Job Work</th>
                <th>Subcontractor</th>
                <th>Item</th>
                <th>From Returns</th>
                <th>Rejection (Kg)</th>
                <th>Rate</th>
                <th>Deduction</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.subcontract.subcontractingId}>
                  <td>{formatDate(r.orderDate)}</td>
                  <td>PBI-{r.subcontract.subcontractingId} ({new Date(r.orderDate).getFullYear()})</td>
                  <td>{r.contractorName}</td>
                  <td>{r.itemName}</td>
                  <td>
                    {formatQty(r.returnsTotal)}
                    {r.returnRejections.length > 1 && (
                      <div className="rejection-breakdown">{r.returnRejections.map((kg) => formatQty(kg)).join(' + ')}</div>
                    )}
                  </td>
                  <td className="rejection-qty">
                    {formatQty(r.rejection)}
                    {r.manual && <span className="rejection-edited-tag">edited</span>}
                  </td>
                  <td>₹{formatMoney(r.rate)}</td>
                  <td className="rejection-qty">- ₹{formatMoney(r.amount)}</td>
                  <td>
                    <button
                      type="button"
                      className="rejection-edit-btn"
                      onClick={() => setEditing(r.subcontract)}
                      title="Edit rejection"
                    >
                      <img src={EditIcon} alt="Edit" width={15} height={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="rejection-total-row">
                <td colSpan={5}>Total</td>
                <td className="rejection-qty">{formatQty(totalRejection)}</td>
                <td></td>
                <td className="rejection-qty">- ₹{formatMoney(totalAmount)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {editing && (
        <RejectionModal subcontract={editing} onClose={() => setEditing(null)} onSubmit={handleSave} />
      )}
    </div>
  );
};

export default SubcontractRejectionPage;
