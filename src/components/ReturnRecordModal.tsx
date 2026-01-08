import React, { useState } from 'react';
import type { Subcontracting, SubReturnRequest } from '../types';
import { PackagingType, ReturnType } from '../types';
import './ReturnRecordModal.css';

interface ReturnRecordModalProps {
  subcontract: Subcontracting;
  onClose: () => void;
  onSubmit: (data: SubReturnRequest) => Promise<void>;
}

const ReturnRecordModal: React.FC<ReturnRecordModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<SubReturnRequest>({
    returnDate: new Date().toISOString().split('T')[0],
    returnStock: 0,
    packagingType: PackagingType.DRUM,
    returnType: ReturnType.MAAL,
    returnElement: null,
    returnElementDrumValue: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let processedValue: any = value;

    if (name === 'returnStock' || name === 'returnElement' || name === 'returnElementDrumValue') {
      processedValue = value === '' ? null : parseFloat(value) || 0;
    }

    const updatedData = {
      ...formData,
      [name]: processedValue,
    };

    // Calculate return stock based on packaging type
    if (name === 'returnElement' || name === 'returnElementDrumValue' || name === 'packagingType') {
      const element = name === 'returnElement' ? (processedValue || 0) : (updatedData.returnElement || 0);
      const drumValue = name === 'returnElementDrumValue' ? (processedValue || 0) : (updatedData.returnElementDrumValue || 0);
      const packagingType = name === 'packagingType' ? processedValue : updatedData.packagingType;

      if (packagingType === PackagingType.DRUM) {
        // Return = returnElement * returnElementDrumValue (converted from grams to kg)
        updatedData.returnStock = element * (drumValue / 1000); // Convert grams to kg
      } else {
        // Return = returnElement
        updatedData.returnStock = element;
      }
    }

    setFormData(updatedData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.returnStock <= 0) {
      setError('Return stock must be greater than 0');
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
        <h2 className="modal-title">Add Return</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Returned Date</label>
            <input
              type="date"
              name="returnDate"
              value={formData.returnDate}
              onChange={handleChange}
              className="form-input"
              placeholder="DD/MM/YYYY"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Return Element</label>
            <div className={`return-element-row ${formData.packagingType === PackagingType.DRUM ? 'has-weight' : 'no-weight'}`}>
              <input
                type="number"
                name="returnElement"
                value={formData.returnElement ?? ''}
                onChange={handleChange}
                placeholder="25"
                className="form-input element-count"
                step="1"
                min="0"
              />
              <select
                name="packagingType"
                value={formData.packagingType}
                onChange={handleChange}
                className="form-input element-type"
                title="Packaging Type"
                required
              >
                <option value={PackagingType.BAG}>Bag</option>
                <option value={PackagingType.FOAM}>Foam</option>
                <option value={PackagingType.PETI}>Peti</option>
                <option value={PackagingType.DRUM}>Drum</option>
              </select>
              {formData.packagingType === PackagingType.DRUM && (
                <input
                  type="number"
                  name="returnElementDrumValue"
                  value={formData.returnElementDrumValue ?? ''}
                  onChange={handleChange}
                  placeholder="1200 Gm"
                  className="form-input element-weight"
                  step="0.01"
                  min="0"
                />
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Return In</label>
            <select
              name="returnType"
              value={formData.returnType}
              onChange={handleChange}
              className="form-input"
              title="Return In Type"
              required
            >
              <option value={ReturnType.MAAL}>Return Maal</option>
              <option value={ReturnType.CHHOL}>Return Chhol</option>
              <option value={ReturnType.TAYAR_MAAL}>Tayar Maal</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Return</label>
            <input
              type="text"
              name="returnStock"
              value={formData.returnStock ? `${formData.returnStock.toFixed(3)} KG` : '0.000 KG'}
              className="form-input return-calculated"
              readOnly
              placeholder="0.000 KG"
            />
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

export default ReturnRecordModal;
