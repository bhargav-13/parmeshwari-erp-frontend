import React, { useState } from 'react';
import type { SubOrderRequest } from '../types';
import { Unit } from '../types';
import './AddSubcontractingModal.css';

interface AddSubcontractingModalProps {
  onClose: () => void;
  onSubmit: (data: SubOrderRequest) => Promise<void>;
  initialData?: SubOrderRequest;
}

const AddSubcontractingModal: React.FC<AddSubcontractingModalProps> = ({
  onClose,
  onSubmit,
  initialData,
}) => {
  const [formData, setFormData] = useState<SubOrderRequest>(
    initialData || {
      contractorName: '',
      itemName: '',
      orderDate: new Date().toISOString().split('T')[0],
      sentStock: 0,
      jobWorkPay: 0,
      price: 0,
      unit: Unit.KG,
      remark: '',
    }
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'sentStock' || name === 'price' || name === 'jobWorkPay' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.contractorName || !formData.itemName) {
      setError('Contractor Name and Item Name are required');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save subcontracting order');
    } finally {
      setLoading(false);
    }
  };

  const isEditMode = !!initialData;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">
          {isEditMode ? 'Edit Subcontracting Order' : 'Add Subcontracting Order'}
        </h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contractor Name:</label>
              <input
                type="text"
                name="contractorName"
                value={formData.contractorName}
                onChange={handleChange}
                placeholder="Enter Contractor name"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Item Name:</label>
              <input
                type="text"
                name="itemName"
                value={formData.itemName}
                onChange={handleChange}
                placeholder="Enter Item name"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Order Date:</label>
              <input
                type="date"
                name="orderDate"
                value={formData.orderDate}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sent Stock:</label>
              <input
                type="number"
                name="sentStock"
                value={formData.sentStock}
                onChange={handleChange}
                placeholder="Enter stock quantity"
                className="form-input"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Job Work Pay:</label>
              <input
                type="number"
                name="jobWorkPay"
                value={formData.jobWorkPay}
                onChange={handleChange}
                placeholder="Enter Job Work Pay"
                className="form-input"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Price Per kg/Pc.</label>
              <div className="price-input-group">
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Enter Price"
                  className="form-input price-input"
                  step="0.01"
                  min="0"
                  required
                />
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleChange}
                  className="unit-select"
                >
                  <option value={Unit.KG}>Kg</option>
                  <option value={Unit.PC}>Pc</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remark</label>
            <textarea
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              placeholder="Enter Something"
              className="form-textarea"
              rows={4}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="submit" className="save-button" disabled={loading}>
              {loading ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
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

export default AddSubcontractingModal;
