import React, { useState, useEffect, useMemo } from 'react';
import { subcontractingApi } from '../api/subcontracting';
import type { Subcontracting, SubOrderRequest, SubcontractingStats } from '../types';
import { SubcontractingStatus } from '../types';
import AddSubcontractingModal from '../components/AddSubcontractingModal';
import SubcontractingCard from '../components/SubcontractingCard';
import Pagination from '../components/Pagination';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import { currentMonth, describeRange, subcontractTotals, type MonthRange, type PeriodMode } from '../utils/subcontractPeriod';
import './SubcontractingPage.css';

const PERIOD_KEY = 'subcontracting.period';

const readSavedPeriod = (): { mode: PeriodMode; from: string; to: string } => {
  const month = currentMonth();
  try {
    const saved = JSON.parse(localStorage.getItem(PERIOD_KEY) || 'null');
    if (saved && ['month', 'all', 'custom'].includes(saved.mode)) {
      return { mode: saved.mode, from: saved.from || month, to: saved.to || month };
    }
  } catch {
    /* storage unavailable */
  }
  return { mode: 'month', from: month, to: month };
};

const SubcontractingPage: React.FC = () => {
  const [subcontracts, setSubcontracts] = useState<Subcontracting[]>([]);
  const [stats, setStats] = useState<SubcontractingStats>({
    totalOrders: 0,
    inProgress: 0,
    completed: 0,
    totalBilledAmount: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SubcontractingStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  // Figures cover this month unless All time or a custom month range is picked
  const [periodMode, setPeriodMode] = useState<PeriodMode>(() => readSavedPeriod().mode);
  const [customFrom, setCustomFrom] = useState(() => readSavedPeriod().from);
  const [customTo, setCustomTo] = useState(() => readSavedPeriod().to);

  const period: MonthRange | null = useMemo(() => {
    if (periodMode === 'all') return null;
    if (periodMode === 'custom' && customFrom && customTo) {
      return customFrom <= customTo ? { from: customFrom, to: customTo } : { from: customTo, to: customFrom };
    }
    const month = currentMonth();
    return { from: month, to: month };
  }, [periodMode, customFrom, customTo]);

  useEffect(() => {
    try {
      localStorage.setItem(PERIOD_KEY, JSON.stringify({ mode: periodMode, from: customFrom, to: customTo }));
    } catch {
      /* storage unavailable */
    }
  }, [periodMode, customFrom, customTo]);

  useEffect(() => {
    fetchSubcontracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, statusFilter]);

  const fetchSubcontracts = async () => {
    try {
      setLoading(true);
      const response = await subcontractingApi.getSubcontractingList({
        page,
        size: 10,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });

      setSubcontracts(response.data);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);

      // Calculate stats
      // Note: This calculateStats only uses the current page data, which might be incorrect for "Total Orders" stats.
      // But typically stats should come from a separate endpoint or the backend should return them.
      // For now, we keep it as is or accept it only reflects current page (or maybe we should fetch all for stats? No, too heavy).
      // The previous code was calculating stats on `response.data`.
    } catch (error) {
      console.error('Error fetching subcontracts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Stats for the orders shown; the billed amount covers the picked period
  useEffect(() => {
    const data = subcontracts;
    setStats({
      totalOrders: data.length,
      inProgress: data.filter((s) => s.status === SubcontractingStatus.IN_PROCESS).length,
      completed: data.filter((s) => s.status === SubcontractingStatus.COMPLETED).length,
      totalBilledAmount: data.reduce((sum, s) => sum + subcontractTotals(s, period).totalValue, 0),
    });
  }, [subcontracts, period]);

  const handleAddSubcontract = async (data: SubOrderRequest) => {
    try {
      await subcontractingApi.addSubcontracting(data);
      setIsModalOpen(false);
      fetchSubcontracts();
    } catch (error) {
      console.error('Error adding subcontract:', error);
      throw error;
    }
  };

  // Confirmation (with stock impact) happens in SubcontractingCard; errors are shown there
  const handleDeleteSubcontract = async (id: number) => {
    await subcontractingApi.deleteSubcontracting(id);
    fetchSubcontracts();
  };

  return (
    <div className="subcontracting-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Subcontracting Management</h1>
          <p className="page-subtitle">Track materials, processes, and billing for subcontracting work.</p>
        </div>

        <button type="button" className="add-button" onClick={() => setIsModalOpen(true)}>
          <span className="add-icon">+</span>
          <span className="add-text">Add Subcontracting Order</span>
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Orders</span>
            <span className="stat-value">{stats.totalOrders}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">In Progress</span>
            <span className="stat-value">{stats.inProgress}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Completed</span>
            <span className="stat-value">{stats.completed}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Billed Amount</span>
            <span className="stat-value">₹ {stats.totalBilledAmount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            <span className="stat-period">{describeRange(period)}</span>
          </div>
        </div>
      </div>

      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search by name or order"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="order-status-filter">
          <img src={FilterIcon} alt="Filter" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as SubcontractingStatus | '')} title="Filter by status">
            <option value="">All Status</option>
            <option value={SubcontractingStatus.IN_PROCESS}>In Progress</option>
            <option value={SubcontractingStatus.COMPLETED}>Completed</option>
            <option value={SubcontractingStatus.REJECTED}>Rejected</option>
          </select>
        </div>
      </div>

      <div className="sc-period-bar">
        <span className="sc-period-label">Showing</span>
        <div className="sc-period-toggle" role="group" aria-label="Period">
          {([
            ['month', 'This Month'],
            ['custom', 'Custom'],
            ['all', 'All Time'],
          ] as [PeriodMode, string][]).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              className={`sc-period-btn ${periodMode === mode ? 'active' : ''}`}
              onClick={() => setPeriodMode(mode)}
              aria-pressed={periodMode === mode}
            >
              {label}
            </button>
          ))}
        </div>
        {periodMode === 'custom' && (
          <div className="sc-period-range">
            <label>
              From
              <input type="month" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} />
            </label>
            <label>
              To
              <input type="month" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} />
            </label>
          </div>
        )}
        <span className="sc-period-current">{describeRange(period)}</span>
      </div>

      <div className="subcontracts-list">
        {loading ? (
          <Loading message="Loading subcontracting orders..." size="large" />
        ) : subcontracts.length === 0 ? (
          <div className="no-data">No subcontracting orders found.</div>
        ) : (
          subcontracts.map((subcontract) => (
            <SubcontractingCard
              key={subcontract.subcontractingId}
              subcontract={subcontract}
              period={period}
              onDelete={handleDeleteSubcontract}
              onRefresh={fetchSubcontracts}
            />
          ))
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        totalElements={totalElements}
        size={10}
      />

      {isModalOpen && (
        <AddSubcontractingModal
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleAddSubcontract}
        />
      )}
    </div>
  );
};

export default SubcontractingPage;
