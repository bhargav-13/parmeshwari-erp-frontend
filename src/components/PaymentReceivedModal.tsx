import React, { useState } from 'react';
import { paymentApi } from '../api/payment';
import type { Payment, PaymentReceiveRequest } from '../types';
import './PaymentReceivedModal.css';

interface PaymentReceivedModalProps {
  payment: Payment;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentReceivedModal: React.FC<PaymentReceivedModalProps> = ({
  payment,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<PaymentReceiveRequest>({
    newReceivedAmount: 0,
    newReceivedDate: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number = value;

    if (name === 'newReceivedAmount') {
      processedValue = value === '' ? 0 : parseFloat(value) || 0;
    }

    setFormData({
      ...formData,
      [name]: processedValue,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.newReceivedAmount <= 0) {
      setError('New received amount must be greater than 0');
      return;
    }

    const remainingAmount = (payment.totalAmount || 0) - (payment.receivedAmount || 0);
    if (formData.newReceivedAmount > remainingAmount) {
      setError(`New received amount cannot exceed outstanding amount (₹${remainingAmount.toLocaleString('en-IN')})`);
      return;
    }

    try {
      setLoading(true);
      await paymentApi.receivePayment(payment.id, formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '₹ 0';
    return `₹ ${amount.toLocaleString('en-IN')}`;
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payment-received-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Payment Received</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Received Amount*</label>
              <input
                type="text"
                value={formatCurrency(payment.receivedAmount)}
                className="form-input readonly-input"
                readOnly
              />
            </div>

            <div className="form-group">
              <label className="form-label">Last Received Date*</label>
              <input
                type="text"
                value={formatDate(payment.lastReceivedDate)}
                className="form-input readonly-input"
                readOnly
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">New Received Amount</label>
              <input
                type="number"
                name="newReceivedAmount"
                value={formData.newReceivedAmount || ''}
                onChange={handleChange}
                className="form-input"
                placeholder="₹ 1,20,000"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Received Date</label>
              <input
                type="date"
                name="newReceivedDate"
                value={formData.newReceivedDate}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentReceivedModal;
