import React, { useState } from 'react';
import type { Subcontracting, SubReturnRequest } from '../types';
import { PackagingType, ReturnType } from '../types';
import './ReturnRecordModal.css';

interface ReturnRecordModalProps {
  subcontract: Subcontracting;
  onClose: () => void;
  onSubmit: (data: SubReturnRequest) => Promise<void>;
}

// Packaging weight values in grams
const PACKAGING_WEIGHTS: Record<PackagingType, number | null> = {
  [PackagingType.BAG]: 0.075, // 0.075 gm
  [PackagingType.FOAM]: 150, // 150 gm
  [PackagingType.PETI]: 1200, // 1200 gm
  [PackagingType.DRUM]: null, // Manual input
};

// Internal form state that includes grossReturn and drumValue for calculation
interface ReturnFormState {
  returnItemName: string;
  returnDate: string;
  returnStock: number;
  grossReturn: number | null;
  returnElement: number | null;
  packagingType: PackagingType;
  returnType: ReturnType;
  drumWeight: number | null; // Weight per drum element in grams
  returnRemark: string;
}

const ReturnRecordModal: React.FC<ReturnRecordModalProps> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<ReturnFormState>({
    returnItemName: '',
    returnDate: new Date().toISOString().split('T')[0],
    returnStock: 0,
    grossReturn: null,
    returnElement: null,
    packagingType: PackagingType.DRUM,
    returnType: ReturnType.MAAL,
    drumWeight: null,
    returnRemark: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get packaging weight for current type (in grams)
  const getPackagingWeight = (): number => {
    if (formData.packagingType === PackagingType.DRUM) {
      return formData.drumWeight || 0;
    }
    return PACKAGING_WEIGHTS[formData.packagingType] || 0;
  };

  // Calculate total return: grossReturn - (packagingWeight * returnElement)
  // packagingWeight is in grams, need to convert to kg
  const calculateTotalReturn = (
    grossReturn: number | null,
    returnElement: number | null,
    packagingType: PackagingType,
    drumWeight: number | null
  ): number => {
    const gross = grossReturn || 0;
    const element = returnElement || 0;

    let packagingWeightGm: number;
    if (packagingType === PackagingType.DRUM) {
      packagingWeightGm = drumWeight || 0;
    } else {
      packagingWeightGm = PACKAGING_WEIGHTS[packagingType] || 0;
    }

    // Convert packaging weight from grams to kg
    const packagingWeightKg = packagingWeightGm / 1000;

    // Total deduction = number of elements * weight per element
    const deduction = element * packagingWeightKg;

    // Total return = gross return - deduction
    const totalReturn = gross - deduction;

    return Math.max(0, totalReturn); // Ensure non-negative
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: any = value;

    if (name === 'returnStock' || name === 'returnElement' || name === 'drumWeight' || name === 'grossReturn') {
      processedValue = value === '' ? null : parseFloat(value) || 0;
    }

    const updatedData = {
      ...formData,
      [name]: processedValue,
    };

    // Recalculate return stock when relevant fields change
    if (name === 'grossReturn' || name === 'returnElement' || name === 'drumWeight' || name === 'packagingType') {
      const grossReturn = name === 'grossReturn' ? processedValue : updatedData.grossReturn;
      const element = name === 'returnElement' ? processedValue : updatedData.returnElement;
      const drumWeight = name === 'drumWeight' ? processedValue : updatedData.drumWeight;
      const packagingType = name === 'packagingType' ? processedValue : updatedData.packagingType;

      updatedData.returnStock = calculateTotalReturn(grossReturn, element, packagingType, drumWeight);
    }

    setFormData(updatedData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.returnItemName) {
      setError('Return Item Name is required');
      return;
    }

    if (formData.returnStock <= 0) {
      setError('Total return must be greater than 0');
      return;
    }

    if (!formData.grossReturn || formData.grossReturn <= 0) {
      setError('Please enter gross return weight');
      return;
    }

    // Prepare data for API (only include fields from SubReturnRequest)
    const submitData: SubReturnRequest = {
      returnItemName: formData.returnItemName,
      returnDate: formData.returnDate,
      returnStock: formData.returnStock,
      returnElement: formData.returnElement,
      packagingType: formData.packagingType,
      returnType: formData.returnType,
      returnRemark: formData.returnRemark || null,
    };

    try {
      setLoading(true);
      await onSubmit(submitData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to return record');
    } finally {
      setLoading(false);
    }
  };

  // Get display text for packaging weight
  const getPackagingWeightDisplay = (): string => {
    if (formData.packagingType === PackagingType.DRUM) {
      return formData.drumWeight ? `${formData.drumWeight} gm` : 'Enter weight';
    }
    const weight = PACKAGING_WEIGHTS[formData.packagingType];
    return weight !== null ? `${weight} gm` : '';
  };

  // Calculate deduction for display
  const getDeductionDisplay = (): string => {
    const element = formData.returnElement || 0;
    const packagingWeightGm = getPackagingWeight();
    const deductionKg = (element * packagingWeightGm) / 1000;
    return deductionKg.toFixed(3);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content return-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Add Return</h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Return Item Name:</label>
              <input
                type="text"
                name="returnItemName"
                value={formData.returnItemName}
                onChange={handleChange}
                placeholder="Enter return item name"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Return Date:</label>
              <input
                type="date"
                name="returnDate"
                value={formData.returnDate}
                onChange={handleChange}
                className="form-input"
                title="Return Date"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Return Element (Count)</label>
            <div className={`return-element-row ${formData.packagingType === PackagingType.DRUM ? 'has-weight' : 'no-weight'}`}>
              <input
                type="number"
                name="returnElement"
                value={formData.returnElement ?? ''}
                onChange={handleChange}
                placeholder="e.g. 10"
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
                <option value={PackagingType.BAG}>Bag (0.075 gm)</option>
                <option value={PackagingType.FOAM}>Foam (150 gm)</option>
                <option value={PackagingType.PETI}>Peti (1200 gm)</option>
                <option value={PackagingType.DRUM}>Drum (Manual)</option>
              </select>
              {formData.packagingType === PackagingType.DRUM && (
                <input
                  type="number"
                  name="drumWeight"
                  value={formData.drumWeight ?? ''}
                  onChange={handleChange}
                  placeholder="Weight in gm"
                  className="form-input element-weight"
                  step="0.01"
                  min="0"
                />
              )}
            </div>
            <span className="packaging-weight-hint">
              Packaging weight: {getPackagingWeightDisplay()}
            </span>
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
            <label className="form-label">Gross Return (Kg)</label>
            <input
              type="number"
              name="grossReturn"
              value={formData.grossReturn ?? ''}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter return weight in Kg"
              step="0.001"
              min="0"
              required
            />
          </div>

          <div className="calculation-summary">
            <div className="calc-row">
              <span className="calc-label">Gross Return:</span>
              <span className="calc-value">{(formData.grossReturn || 0).toFixed(3)} Kg</span>
            </div>
            <div className="calc-row">
              <span className="calc-label">Packaging Deduction:</span>
              <span className="calc-value deduction">- {getDeductionDisplay()} Kg</span>
            </div>
            <div className="calc-row calc-row-formula">
              <span className="calc-formula">({formData.returnElement || 0} pcs × {getPackagingWeight()} gm ÷ 1000)</span>
            </div>
            <div className="calc-row total-row">
              <span className="calc-label">Total Return:</span>
              <span className="calc-value total">{formData.returnStock.toFixed(3)} Kg</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Remark:</label>
            <textarea
              name="returnRemark"
              value={formData.returnRemark}
              onChange={handleChange}
              placeholder="Enter remark (optional)"
              title="Return Remark"
              className="form-textarea"
              rows={3}
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
