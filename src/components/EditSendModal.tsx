import React, { useState } from 'react';
import type { SubSend, SubSendRequest, Unit } from '../types';
import './AddSubcontractingModal.css';

interface EditSendModalProps {
  send: SubSend;
  unit: Unit;
  onClose: () => void;
  onSubmit: (data: SubSendRequest) => Promise<void>;
}

// Edits one lot of stock sent to a job work; the job work's totals are re-derived from its sends
const EditSendModal: React.FC<EditSendModalProps> = ({ send, unit, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    sendDate: send.sendDate,
    sentStock: String(send.sentStock ?? ''),
    price: String(send.price ?? ''),
    jobWorkPay: String(send.jobWorkPay ?? ''),
    remark: send.remark || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const sentStock = parseFloat(formData.sentStock);
    if (!formData.sendDate) {
      setError('Send date is required');
      return;
    }
    if (!(sentStock > 0)) {
      setError('Sent stock must be greater than 0');
      return;
    }
    try {
      setLoading(true);
      await onSubmit({
        sendDate: formData.sendDate,
        sentStock,
        price: parseFloat(formData.price) || 0,
        jobWorkPay: parseFloat(formData.jobWorkPay) || 0,
        remark: formData.remark || null,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update send');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay drawer-overlay" onClick={onClose}>
      <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Edit Sent Lot</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="sendDate">Send Date:</label>
              <input
                id="sendDate"
                type="date"
                name="sendDate"
                value={formData.sendDate}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sentStock">Sent Stock ({unit}):</label>
              <input
                id="sentStock"
                type="number"
                name="sentStock"
                value={formData.sentStock}
                onChange={handleChange}
                className="form-input"
                step="0.001"
                min="0"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="jobWorkPay">Job Work Pay:</label>
              <input
                id="jobWorkPay"
                type="number"
                name="jobWorkPay"
                value={formData.jobWorkPay}
                onChange={handleChange}
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="price">Price Per {unit}:</label>
              <input
                id="price"
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="form-input"
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="remark">Remark</label>
            <textarea
              id="remark"
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              className="form-textarea"
              rows={3}
              placeholder="Enter remark (optional)"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : 'Update'}
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

export default EditSendModal;
