import React, { useState, useEffect, useRef } from 'react';
import { invoiceApi } from '../api/invoice';
import { ordersApi } from '../api/orders';
import type { Invoice, InvoiceStats, Order, OrderRequest } from '../types';
import { InvoiceStatus, InvoiceFloor, BillingType } from '../types';
import InvoiceCard from '../components/InvoiceCard';
import AddOrderModal from '../components/AddOrderModal';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import './InvoicePage.css';

interface InvoicePageProps {
  floor: InvoiceFloor;
}

/** Cards shown per page on screen; the totals above always cover every matching invoice. */
const PAGE_SIZE = 24;
/** Invoices fetched per request while loading all of them. */
const FETCH_SIZE = 200;

const InvoicePage: React.FC<InvoicePageProps> = ({ floor }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    totalOfficialBill: 0,
    totalOfflineBill: 0,
    totalBilledAmount: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedMode, setSelectedMode] = useState<BillingType>(BillingType.OFFICIAL);
  // An invoice is made from its order, so editing an invoice edits that order
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  // Only the latest request may update the list, so fast typing cannot show stale results
  const requestId = useRef(0);

  // Search once typing pauses rather than on every key
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setPage(0);
    fetchInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, floor, selectedMode]);

  // Every matching invoice, a page of the server's list at a time
  const fetchInvoices = async () => {
    const id = ++requestId.current;
    try {
      setLoading(true);
      setLoadError(null);
      const all: Invoice[] = [];
      for (let serverPage = 0; ; serverPage++) {
        const response = await invoiceApi.getInvoiceList({
          floor,
          mode: selectedMode,
          page: serverPage,
          size: FETCH_SIZE,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
        });
        all.push(...response.data);
        if (response.last || response.data.length < FETCH_SIZE) break;
      }
      if (id !== requestId.current) return;
      setInvoices(all);
      calculateStats(all);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      if (id === requestId.current) setLoadError('Could not load invoices. Please try again.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const pageCount = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageInvoices = invoices.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const goToPage = (next: number) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateStats = (data: Invoice[]) => {
    const totalOfficialBill = data.reduce((sum, inv) => sum + inv.order.officialBillAmount, 0);
    const totalOfflineBill = data.reduce((sum, inv) => sum + (inv.order.offlineTotal || 0), 0);
    const totalBilledAmount = data.reduce((sum, inv) => sum + inv.order.grandTotal, 0);

    setStats({
      totalOfficialBill,
      totalOfflineBill,
      totalBilledAmount,
    });
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    try {
      setEditError(null);
      setEditingOrder(await ordersApi.getOrderById(invoice.order.id));
    } catch (error) {
      console.error('Error loading order for invoice:', error);
      setEditError(`Could not open PBI-${invoice.order.id} for editing. Please try again.`);
    }
  };

  const handleSubmitEdit = async (payload: OrderRequest) => {
    if (!editingOrder) return;
    await ordersApi.updateOrder(editingOrder.id, payload);
    setEditingOrder(null);
    fetchInvoices();
  };

  const handleDeleteInvoice = async (id: number) => {
    try {
      await invoiceApi.deleteInvoice(id);
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
    }
  };

  return (
    <div className="invoice-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Billing Management</h1>
          <p className="page-subtitle">Manage and track all your billing records</p>
        </div>
        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-btn ${selectedMode === BillingType.OFFICIAL ? 'active' : ''}`}
            onClick={() => setSelectedMode(BillingType.OFFICIAL)}
          >
            Official
          </button>
          <button
            type="button"
            className={`mode-btn ${selectedMode === BillingType.OFFLINE ? 'active' : ''}`}
            onClick={() => setSelectedMode(BillingType.OFFLINE)}
          >
            Offline
          </button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Official Bill</span>
            <span className="stat-value">₹{stats.totalOfficialBill.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Offline Bill</span>
            <span className="stat-value">₹{stats.totalOfflineBill.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Billed Amount</span>
            <span className="stat-value">₹{stats.totalBilledAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search by customer or order"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="order-status-filter">
          <img src={FilterIcon} alt="Filter" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')} title="Filter by status">
            <option value="">All Status</option>
            <option value={InvoiceStatus.PENDING}>Pending</option>
            <option value={InvoiceStatus.COMPLETED}>Completed</option>
          </select>
        </div>
      </div>

      <div className="invoices-list">
        {loading ? (
          <Loading message="Loading invoices..." size="large" />
        ) : loadError ? (
          <div className="no-data">
            {loadError}{' '}
            <button type="button" className="invoice-page-button" onClick={fetchInvoices}>Try again</button>
          </div>
        ) : invoices.length === 0 ? (
          <div className="no-data">No invoices found.</div>
        ) : (
          <>
          {editError && <div className="no-data">{editError}</div>}
          <div className="invoice-list-count">
            Showing {currentPage * PAGE_SIZE + 1}–{currentPage * PAGE_SIZE + pageInvoices.length} of {invoices.length} invoices
          </div>
          <div className="invoice-cards-grid">
            {pageInvoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                billingType={selectedMode}
                onDelete={handleDeleteInvoice}
                onRefresh={fetchInvoices}
                onEdit={handleEditInvoice}
              />
            ))}
          </div>
          {pageCount > 1 && (
            <nav className="invoice-pagination" aria-label="Invoice pages">
              <button type="button" className="invoice-page-button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0}>
                ‹ Previous
              </button>
              <span>Page {currentPage + 1} of {pageCount}</span>
              <button type="button" className="invoice-page-button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount - 1}>
                Next ›
              </button>
            </nav>
          )}
          </>
        )}
      </div>
      {editingOrder && (
        <AddOrderModal
          onClose={() => setEditingOrder(null)}
          onSubmit={handleSubmitEdit}
          initialData={editingOrder}
        />
      )}
    </div>
  );
};

export default InvoicePage;
