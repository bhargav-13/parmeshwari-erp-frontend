import React, { useState } from 'react';
import type { Subcontracting, SubReturnRequest } from '../types';
import './ReturnRecordModal.css';

interface ReturnRecordModalProps {
  subcontract: Subcontracting;
  onClose: () => void;
  onSubmit: (data: SubReturnRequest) => Promise<void>;
}

const ReturnRecordModal: React.FC<ReturnRecordModalProps> = ({ subcontract, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<SubReturnRequest>({
    returnDate: new Date().toISOString().split('T')[0],
    returnStock: 0,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'returnStock' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.returnStock <= 0) {
      setError('Return stock must be greater than 0');
      return;
    }

    // Calculate remaining stock (considering already returned stock)
    const alreadyReturned = subcontract.returnStock || 0;
    const remainingStock = subcontract.sentStock - alreadyReturned;

    // Validate that this incremental return doesn't exceed remaining stock
    if (formData.returnStock > remainingStock) {
      setError(`Return stock cannot exceed remaining stock. Already returned: ${alreadyReturned} ${subcontract.unit}, Remaining: ${remainingStock} ${subcontract.unit}`);
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to return record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content return-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Return Record</h2>

        <div className="return-info">
          <div className="info-row">
            <span className="info-label">Order ID:</span>
            <span className="info-value">PBI-{subcontract.subcontractingId}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Contractor:</span>
            <span className="info-value">{subcontract.contractorName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Material:</span>
            <span className="info-value">{subcontract.materialName}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Sent Stock:</span>
            <span className="info-value">
              {subcontract.sentStock} {subcontract.unit}
            </span>
          </div>
          {subcontract.returnStock && subcontract.returnStock > 0 && (
            <div className="info-row">
              <span className="info-label">Already Returned:</span>
              <span className="info-value">
                {subcontract.returnStock} {subcontract.unit}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Return Date:</label>
            <input
              type="date"
              name="returnDate"
              value={formData.returnDate}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Return Stock ({subcontract.unit}):
              {subcontract.returnStock && subcontract.returnStock > 0 && (
                <span style={{ fontSize: '12px', color: '#666', marginLeft: '8px' }}>
                  (Max: {subcontract.sentStock - subcontract.returnStock} {subcontract.unit})
                </span>
              )}
            </label>
            <input
              type="number"
              name="returnStock"
              value={formData.returnStock}
              onChange={handleChange}
              placeholder={`Enter return stock in ${subcontract.unit}`}
              className="form-input"
              step="0.01"
              min="0"
              max={subcontract.sentStock - (subcontract.returnStock || 0)}
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit'}
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

export default ReturnRecordModal;
