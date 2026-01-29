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
  [PackagingType.BAG]: 75, // 75 gm (0.075 KG)
  [PackagingType.FOAM]: 150, // 150 gm
  [PackagingType.PETI]: 1200, // 1200 gm
  [PackagingType.DRUM]: null, // Manual input
};

// Internal form state
interface ReturnFormState {
  returnDate: string;
  returnStock: number; // Calculated total return
  grossReturn: string; // User input as string
  returnElement: string; // Box/Bag count as string
  packagingType: PackagingType;
  returnType: ReturnType;
  drumWeight: string; // Weight per drum element as string
  returnRemark: string;
}

const ReturnRecordModal: React.FC<ReturnRecordModalProps> = ({ subcontract, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<ReturnFormState>({
    returnDate: new Date().toISOString().split('T')[0],
    returnStock: 0,
    grossReturn: '',
    returnElement: '',
    packagingType: PackagingType.DRUM,
    returnType: ReturnType.MAAL,
    drumWeight: '',
    returnRemark: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // @ts-ignore - warnings will be displayed in JSX later
  const [warnings, setWarnings] = useState<string[]>([]);

  // Helper: Parse numeric string values
  const parseNum = (val: string | number): number => {
    if (typeof val === 'number') return val;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Get packaging weight for current type (in grams)
  const getPackagingWeight = (): number => {
    if (formData.packagingType === PackagingType.DRUM) {
      return parseNum(formData.drumWeight);
    }
    return PACKAGING_WEIGHTS[formData.packagingType] || 0;
  };

  // Calculate total return: grossReturn - (packagingWeight * returnElement)
  const calculateTotalReturn = (
    grossReturn: string | number,
    returnElement: string | number,
    packagingType: PackagingType,
    drumWeight: string | number
  ): number => {
    const gross = parseNum(grossReturn);
    const element = parseNum(returnElement);

    let packagingWeightGm: number;
    if (packagingType === PackagingType.DRUM) {
      packagingWeightGm = parseNum(drumWeight);
    } else {
      packagingWeightGm = PACKAGING_WEIGHTS[packagingType] || 0;
    }

    const packagingWeightKg = packagingWeightGm / 1000;
    const deduction = element * packagingWeightKg;
    const totalReturn = gross - deduction;

    return Math.max(0, totalReturn);
  };

  // Enhanced validation with all 5 business rule categories
  const validateField = (name: string, value: any, allData = formData): string | null => {
    const grossReturnNum = parseNum(allData.grossReturn);
    const returnElementNum = parseNum(allData.returnElement);
    const drumWeightNum = parseNum(allData.drumWeight);

    switch (name) {
      case 'returnDate':
        if (!value) return 'Return Date is required';
        // Date consistency: Return date >= Order date
        if (subcontract.orderDate && new Date(value) < new Date(subcontract.orderDate)) {
          return 'Return date cannot be before order date';
        }
        return null;

      case 'grossReturn': {
        const valueNum = parseNum(value);
        if (!value || valueNum <= 0) return 'Gross return must be > 0';

        // Over-return prevention: Check NET return against remaining stock
        const sentStock = subcontract.sentStock || 0;
        const previousReturns = subcontract.subReturns || [];
        // Calculate previous NET returns to find remaining stock
        const previouslyReturnedStock = previousReturns.reduce((sum, r) => {
          const deduction = (r.packagingWeight || 0) * (r.packagingCount || 0);
          return sum + (r.netReturnStock ?? (r.returnStock - deduction));
        }, 0);

        const remainingStock = sentStock - previouslyReturnedStock;

        // Calculate current deduction to find Net
        const returnElementNum = parseNum(allData.returnElement);
        const drumWeightNum = parseNum(allData.drumWeight);

        let packagingWeightGm: number;
        if (allData.packagingType === PackagingType.DRUM) {
          packagingWeightGm = drumWeightNum;
        } else {
          packagingWeightGm = PACKAGING_WEIGHTS[allData.packagingType] || 0;
        }

        const currentDeduction = (returnElementNum * packagingWeightGm) / 1000;
        const currentNetReturn = valueNum - currentDeduction;

        // Add a small buffer for float precision
        if (currentNetReturn > remainingStock + 0.001) {
          return `Net return (${currentNetReturn.toFixed(3)}) cannot exceed remaining stock (${remainingStock.toFixed(3)} Kg)`;
        }
        return null;
      }

      case 'returnElement': {
        const valueNum = parseNum(value);
        if (valueNum < 0) return 'Element count must be >= 0';
        // Weight integrity: Check if total packaging < gross
        let packagingWeightGm: number;
        if (allData.packagingType === PackagingType.DRUM) {
          packagingWeightGm = drumWeightNum;
        } else {
          packagingWeightGm = PACKAGING_WEIGHTS[allData.packagingType] || 0;
        }
        const totalPackagingKg = (valueNum * packagingWeightGm) / 1000;
        if (totalPackagingKg >= grossReturnNum && grossReturnNum > 0) {
          return 'Total packaging weight cannot exceed gross return';
        }
        return null;
      }

      case 'drumWeight': {
        const valueNum = parseNum(value);
        if (allData.packagingType === PackagingType.DRUM && valueNum <= 0) {
          return 'Drum weight is required';
        }
        // Weight integrity check
        const totalPackagingKg = (returnElementNum * valueNum) / 1000;
        if (totalPackagingKg >= grossReturnNum && grossReturnNum > 0) {
          return 'Total packaging weight cannot exceed gross return';
        }
        return null;
      }

      default:
        return null;
    }
  };

  const getFieldError = (name: string) => {
    if (!touched[name]) return null;
    return validateField(name, formData[name as keyof typeof formData]);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setTouched(prev => ({ ...prev, [e.target.name]: true }));
  };

  // Handle numeric input (text with numeric-only validation)
  const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Allow digits, decimal point, and empty string
    const numericValue = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = numericValue.split('.');
    const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;

    const updatedData = {
      ...formData,
      [name]: cleanValue,
    };

    // Recalculate return stock when relevant fields change
    if (name === 'grossReturn' || name === 'returnElement' || name === 'drumWeight') {
      updatedData.returnStock = calculateTotalReturn(
        updatedData.grossReturn,
        updatedData.returnElement,
        updatedData.packagingType,
        updatedData.drumWeight
      );
    }

    setFormData(updatedData);
    setWarnings([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    const updatedData = {
      ...formData,
      [name]: value,
    };

    // Recalculate return stock when packaging type changes
    if (name === 'packagingType') {
      updatedData.returnStock = calculateTotalReturn(
        updatedData.grossReturn,
        updatedData.returnElement,
        value as PackagingType,
        updatedData.drumWeight
      );
    }

    setFormData(updatedData);
    setWarnings([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarnings([]);

    // Workflow state protection
    if (subcontract.status === 'COMPLETED') {
      setError('Cannot add return to a completed order. Please reopen it first.');
      return;
    }

    // Mark all as touched
    const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);

    // Validate
    const errors = Object.keys(formData).map(key => validateField(key, formData[key as keyof typeof formData])).filter(Boolean);
    if (errors.length > 0) return;

    if (formData.returnStock <= 0) {
      setError('Total return must be greater than 0');
      return;
    }

    // Check warnings
    const newWarnings: string[] = [];

    // Future date warning
    if (new Date(formData.returnDate) > new Date()) {
      newWarnings.push('You are recording a return in the future.');
    }

    // Balance check: Auto-suggest completion
    const grossReturnNum = parseNum(formData.grossReturn);
    const sentStock = subcontract.sentStock || 0;
    const previousReturns = subcontract.subReturns || [];
    const previouslyReturnedStock = previousReturns.reduce((sum, r) => sum + r.returnStock, 0);

    if (Math.abs((grossReturnNum + previouslyReturnedStock) - sentStock) < 0.001 && subcontract.status === 'IN_PROCESS') {
      newWarnings.push('This return completes the order. Consider marking it as "Completed".');
    }

    if (newWarnings.length > 0) {
      setWarnings(newWarnings);
      // Don't block submission, just show warnings
    }

    const packagingWeightGm = getPackagingWeight();
    const packagingWeightKg = packagingWeightGm / 1000;

    const submitData: SubReturnRequest = {
      returnDate: formData.returnDate,
      returnStock: parseNum(formData.grossReturn),
      packagingType: formData.packagingType,
      packagingWeight: packagingWeightKg,
      packagingCount: parseNum(formData.returnElement),
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
    const element = parseNum(formData.returnElement);
    const packagingWeightGm = getPackagingWeight();
    const deductionKg = (element * packagingWeightGm) / 1000;
    return deductionKg.toFixed(3);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content return-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Add Return</h2>

        <form onSubmit={handleSubmit} className="modal-form" noValidate>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Return Date:</label>
              <input
                type="date"
                name="returnDate"
                value={formData.returnDate}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`form-input ${getFieldError('returnDate') ? 'invalid' : ''}`}
                required
              />
              {getFieldError('returnDate') && <span className="field-error-text">{getFieldError('returnDate')}</span>}
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
                onBlur={handleBlur}
                placeholder="e.g. 10"
                className={`form-input element-count ${getFieldError('returnElement') ? 'invalid' : ''}`}
                step="1"
                min="0"
              />
              <select
                name="packagingType"
                value={formData.packagingType}
                onChange={handleChange}
                className="form-input element-type"
              >
                <option value={PackagingType.BAG}>Bag (75 gm)</option>
                <option value={PackagingType.FOAM}>Foam (150 gm)</option>
                <option value={PackagingType.PETI}>Peti (1200 gm)</option>
                <option value={PackagingType.DRUM}>Drum (Manual)</option>
              </select>
              {formData.packagingType === PackagingType.DRUM && (
                <input
                  type="text"
                  inputMode="decimal"
                  name="drumWeight"
                  value={formData.drumWeight}
                  onChange={handleNumericInput}
                  onBlur={handleBlur}
                  placeholder="Weight in gm"
                  className={`form-input element-weight ${getFieldError('drumWeight') ? 'invalid' : ''}`}
                />
              )}
            </div>
            {getFieldError('returnElement') && <span className="field-error-text">{getFieldError('returnElement')}</span>}
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
              type="text"
              inputMode="decimal"
              name="grossReturn"
              value={formData.grossReturn}
              onChange={handleNumericInput}
              onBlur={handleBlur}
              className={`form-input ${getFieldError('grossReturn') ? 'invalid' : ''}`}
              placeholder="Enter return weight in Kg"
              required
            />
            {getFieldError('grossReturn') && <span className="field-error-text">{getFieldError('grossReturn')}</span>}
          </div>

          <div className="calculation-summary">
            <div className="calc-row">
              <span className="calc-label">Gross Return:</span>
              <span className="calc-value">{parseNum(formData.grossReturn).toFixed(3)} Kg</span>
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
