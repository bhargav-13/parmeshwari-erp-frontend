import React, { useState } from 'react';
import type { Subcontracting, SubRejectionRequest } from '../types';
import './AddSubcontractingModal.css';

interface RejectionModalProps {
  subcontract: Subcontracting;
  onClose: () => void;
  onSubmit: (data: SubRejectionRequest) => Promise<void>;
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
const round2 = (n: number) => Math.round(n * 100) / 100;
const formatMoney = (n: number) =>
  n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Job work rejection: defaults to the sum of the returns' rejection at the market price; either
// can be changed by hand. Kg x rate comes off the job pay in the statement.
const RejectionModal: React.FC<RejectionModalProps> = ({ subcontract, onClose, onSubmit }) => {
  const returnsTotal = round3(
    subcontract.returnsRejectionStock ??
      (subcontract.subReturns || []).reduce((sum, r) => sum + (r.rejectionStock || 0), 0)
  );
  const marketPrice = subcontract.price || 0;
  const [kg, setKg] = useState(String(round3(subcontract.rejectionStock ?? returnsTotal)));
  const [rate, setRate] = useState(String(subcontract.rejectionPrice ?? marketPrice));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kgNum = parseFloat(kg) || 0;
  const rateNum = parseFloat(rate) || 0;
  const amount = round2(kgNum * rateNum);
  const grossJobPay = (subcontract.jobWorkPay || 0) * (subcontract.sentStock || 0);
  const returnsCount = (subcontract.subReturns || []).filter((r) => (r.rejectionStock || 0) > 0).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (kg.trim() === '' || kgNum < 0) {
      setError('Enter the rejected kg (0 or more)');
      return;
    }
    if (rate.trim() === '' || rateNum < 0) {
      setError('Enter the rate (0 or more)');
      return;
    }
    try {
      setLoading(true);
      // Matching the default sends null, so the job work keeps following its returns / price
      await onSubmit({
        rejectionStock: Math.abs(kgNum - returnsTotal) < 0.0005 ? null : round3(kgNum),
        rejectionPrice: Math.abs(rateNum - marketPrice) < 0.005 ? null : rateNum,
      });
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(message || 'Failed to save rejection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay drawer-overlay" onClick={onClose}>
      <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Rejection · PBI-{subcontract.subcontractingId}</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="rejectionKg">Rejection (Kg):</label>
              <input
                id="rejectionKg"
                type="number"
                value={kg}
                onChange={(e) => setKg(e.target.value)}
                className="form-input"
                step="0.001"
                min="0"
                autoFocus
              />
              <span className="rejection-hint">
                From returns: {returnsTotal.toFixed(3)} kg
                {returnsCount > 0 && ` (${returnsCount} return${returnsCount > 1 ? 's' : ''})`}
                {Math.abs(kgNum - returnsTotal) >= 0.0005 && (
                  <button type="button" className="rejection-reset" onClick={() => setKg(String(returnsTotal))}>
                    Use this
                  </button>
                )}
              </span>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="rejectionRate">Rate per Kg:</label>
              <input
                id="rejectionRate"
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="form-input"
                step="0.01"
                min="0"
              />
              <span className="rejection-hint">
                Market price: ₹{formatMoney(marketPrice)}
                {Math.abs(rateNum - marketPrice) >= 0.005 && (
                  <button type="button" className="rejection-reset" onClick={() => setRate(String(marketPrice))}>
                    Use this
                  </button>
                )}
              </span>
            </div>
          </div>

          <div className="rejection-calc">
            <div className="rejection-calc-row">
              <span>Job Pay ({(subcontract.sentStock || 0).toFixed(3)} × ₹{formatMoney(subcontract.jobWorkPay || 0)})</span>
              <span>₹{formatMoney(grossJobPay)}</span>
            </div>
            <div className="rejection-calc-row deduction">
              <span>Rejection ({kgNum.toFixed(3)} × ₹{formatMoney(rateNum)})</span>
              <span>- ₹{formatMoney(amount)}</span>
            </div>
            <div className="rejection-calc-row total">
              <span>Net Job Pay</span>
              <span>₹{formatMoney(grossJobPay - amount)}</span>
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RejectionModal;
