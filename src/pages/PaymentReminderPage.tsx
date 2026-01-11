import React, { useState, useEffect } from 'react';
import { paymentApi } from '../api/payment';
import type { Payment, PaymentStats } from '../types';
import { PaymentStatus, PaymentFloor } from '../types';
import PaymentReceivedModal from '../components/PaymentReceivedModal';
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
  const [sendingReminderId, setSendingReminderId] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, statusFilter, floor]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentApi.getPaymentList({
        floor,
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

  const handleSendReminder = async (paymentId: number) => {
    try {
      setSendingReminderId(paymentId);
      await paymentApi.sendReminder(paymentId);
      fetchPayments();
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Failed to send reminder. Please try again.');
    } finally {
      setSendingReminderId(null);
    }
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

  const getStatusBadgeClass = (status: PaymentStatus): string => {
    switch (status) {
      case PaymentStatus.OVERDUE:
        return 'status-overdue';
      case PaymentStatus.DUE_SOON:
        return 'status-due-soon';
      case PaymentStatus.UPCOMING:
        return 'status-upcoming';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: PaymentStatus): string => {
    switch (status) {
      case PaymentStatus.OVERDUE:
        return 'Overdue';
      case PaymentStatus.DUE_SOON:
        return 'Due soon';
      case PaymentStatus.UPCOMING:
        return 'Upcoming';
      default:
        return status;
    }
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

        <button type="button" className="bulk-reminder-button">
          <img src={SendIcon} alt="Send" className="send-icon" />
          <span>Send Bulk Reminder</span>
        </button>
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
        ) : payments.length === 0 ? (
          <div className="no-data">No payment records found.</div>
        ) : (
          <table className="payment-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Received Payment</th>
                <th>Total Amount</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Last Reminder</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  onClick={() => handleRowClick(payment)}
                  className="payment-row"
                >
                  <td>{formatInvoiceId(payment.orderId)}</td>
                  <td>{payment.orderId || '—'}</td>
                  <td>{formatCurrency(payment.receivedAmount)}</td>
                  <td>{formatCurrency(payment.totalAmount)}</td>
                  <td>{formatDate(payment.dueDate)}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(payment.paymentStatus)}`}>
                      {getStatusLabel(payment.paymentStatus)}
                    </span>
                  </td>
                  <td>{formatDate(payment.lastReminder)}</td>
                  <td>
                    <button
                      type="button"
                      className="send-reminder-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendReminder(payment.id);
                      }}
                      disabled={sendingReminderId === payment.id}
                    >
                      {sendingReminderId === payment.id ? (
                        <span className="loading-spinner"></span>
                      ) : (
                        <>
                          <img src={SendIcon} alt="Send" className="send-icon-small" />
                          <span>Send Reminder</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
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
    </div>
  );
};

export default PaymentReminderPage;
