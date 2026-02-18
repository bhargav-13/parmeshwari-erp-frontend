import React, { useState, useEffect } from 'react';
import { paymentApi } from '../api/payment';
import type { Payment, PaymentStats } from '../types';
import { PaymentStatus, PaymentFloor, BillingType } from '../types';
import PaymentReceivedModal from '../components/PaymentReceivedModal';
import PaymentDownloadOptionsModal from '../components/PaymentDownloadOptionsModal';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import SendIcon from '../assets/send.svg';
import './PaymentReminderPage.css';

interface PaymentReminderPageProps {
  floor: PaymentFloor;
}

const PaymentReminderPage: React.FC<PaymentReminderPageProps> = ({ floor }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedMode, setSelectedMode] = useState<BillingType>(BillingType.OFFICIAL);
  const [stats, setStats] = useState<PaymentStats>({
    overduePayments: 0,
    overdueAmount: 0,
    dueSoonCount: 0,
    totalOutstanding: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [page] = useState(0);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDownloadOptionsOpen, setIsDownloadOptionsOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, statusFilter, floor, selectedMode]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentApi.getPaymentList({
        floor,
        mode: selectedMode,
        page,
        size: 50,
        search: searchQuery || undefined,
        status: statusFilter || undefined,
      });

      setPayments(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Payment[]) => {
    const overduePayments = data.filter(p => p.paymentStatus === PaymentStatus.OVERDUE);
    const overdueAmount = overduePayments.reduce((sum, p) => sum + ((p.totalAmount || 0) - (p.receivedAmount || 0)), 0);
    const dueSoonCount = data.filter(p => p.paymentStatus === PaymentStatus.DUE_SOON).length;
    const totalOutstanding = data.reduce((sum, p) => sum + ((p.totalAmount || 0) - (p.receivedAmount || 0)), 0);

    setStats({
      overduePayments: overduePayments.length,
      overdueAmount,
      dueSoonCount,
      totalOutstanding,
    });
  };


  const handleRowClick = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false);
    setSelectedPayment(null);
  };

  const handlePaymentSuccess = () => {
    fetchPayments();
    handlePaymentModalClose();
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '₹ 0';
    return `₹ ${amount.toLocaleString('en-IN')}`;
  };


  const formatInvoiceId = (orderId: number): string => {
    return `PBI - ${String(orderId).padStart(5, '0')}`;
  };

  return (
    <div className="payment-reminder-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Payment Reminder</h1>
          <p className="page-subtitle">Track and send payment reminder to customers</p>
        </div>

        <div className="page-header-actions">
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

          <button type="button" className="bulk-reminder-button">
            <img src={SendIcon} alt="Send" className="send-icon" />
            <span>Send Bulk Reminder</span>
          </button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Overdue Payments</span>
            <span className="stat-value">
              {formatCurrency(stats.overdueAmount)} ({stats.overduePayments} Invoices)
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Due Soon</span>
            <span className="stat-value">{stats.dueSoonCount} Invoices</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Outstanding</span>
            <span className="stat-value">{formatCurrency(stats.totalOutstanding)}</span>
          </div>
        </div>
      </div>

      <div className="order-filters">
        <div className="order-search">
          <img src={SearchIcon} alt="Search" />
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="action-button secondary-button"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#fff',
            border: '1.5px solid #b4d5ef',
            borderRadius: '10px',
            padding: '10px 20px',
            cursor: 'pointer',
            height: '45px'
          }}
          onClick={() => setIsDownloadOptionsOpen(true)}
        >
          <span className="button-text" style={{ fontFamily: "'Jost', sans-serif", fontSize: '14px', fontWeight: 500, color: '#17344d' }}>Download</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#17344d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <div className="order-status-filter">
          <img src={FilterIcon} alt="Filter" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | '')}
            title="Filter by status"
          >
            <option value="">All Status</option>
            <option value={PaymentStatus.OVERDUE}>Overdue</option>
            <option value={PaymentStatus.DUE_SOON}>Due Soon</option>
            <option value={PaymentStatus.UPCOMING}>Upcoming</option>
          </select>
        </div>
      </div>

      <div className="payment-table-container">
        {loading ? (
          <Loading message="Loading payments..." size="large" />
        ) : (
          <table className="payment-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item Name</th>
                <th>Quality</th>
                <th>Price</th>
                <th>Total Amount</th>
                <th>Bill</th>
                <th>GST</th>
                <th>Total Online</th>
                <th>Total Offline</th>
                <th>Receive Offline</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                // Adding a few mock rows for visibility if API is empty
                <>
                  <tr className="payment-row">
                    <td>01/01/2026</td>
                    <td>Copper Wire</td>
                    <td>Premium</td>
                    <td>₹ 250</td>
                    <td>₹ 12,500</td>
                    <td>INV-001</td>
                    <td>₹ 2,250</td>
                    <td>₹ 5,000</td>
                    <td>₹ 9,750</td>
                    <td>₹ 9,750</td>
                  </tr>
                  <tr className="payment-row">
                    <td>15/02/2026</td>
                    <td>Aluminum Rod</td>
                    <td>Standard</td>
                    <td>₹ 150</td>
                    <td>₹ 7,500</td>
                    <td>INV-002</td>
                    <td>₹ 1,350</td>
                    <td>₹ 3,000</td>
                    <td>₹ 5,850</td>
                    <td>₹ 5,850</td>
                  </tr>
                </>
              ) : (
                payments.map((payment) => (
                  <tr
                    key={payment.id}
                    onClick={() => handleRowClick(payment)}
                    className="payment-row"
                  >
                    <td>{formatDate(payment.dueDate)}</td>
                    <td>{payment.customerName || '—'}</td>
                    <td>{/* Quality placeholder */ '—'}</td>
                    <td>{/* Price placeholder */ '—'}</td>
                    <td>{formatCurrency(payment.totalAmount)}</td>
                    <td>{formatInvoiceId(payment.orderId)}</td>
                    <td>{/* GST placeholder */ '₹ 0'}</td>
                    <td>{/* Total Online placeholder */ '₹ 0'}</td>
                    <td>{formatCurrency(payment.receivedAmount)}</td>
                    <td>{formatCurrency(payment.receivedAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {isPaymentModalOpen && selectedPayment && (
        <PaymentReceivedModal
          payment={selectedPayment}
          onClose={handlePaymentModalClose}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {isDownloadOptionsOpen && (
        <PaymentDownloadOptionsModal
          onClose={() => setIsDownloadOptionsOpen(false)}
          onNext={(partyName, startDate, endDate) => {
            console.log('Downloading for:', partyName, startDate, endDate);
            setIsDownloadOptionsOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default PaymentReminderPage;
