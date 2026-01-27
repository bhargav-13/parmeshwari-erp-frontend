import React, { useState } from 'react';
import type { CromeReturnRequest, Crome } from '../types';
import { PackagingType, InventoryFloor, SubcontractingStatus } from '../types';
import './CromeReturnModal.css';

interface CromeReturnModalProps {
    cromeId: number;
    itemName: string;
    crome: Crome;
    onClose: () => void;
    onSubmit: (data: CromeReturnRequest) => Promise<void>;
}

const CromeReturnModal: React.FC<CromeReturnModalProps> = ({ itemName, crome, onClose, onSubmit }) => {
    const [formData, setFormData] = useState({
        returnDate: new Date().toISOString().split('T')[0],
        returnStock: '',
        packagingType: PackagingType.PETI,
        packagingWeight: '1.2',
        packagingCount: '',
        returnRemark: '',
        addToInventory: true,
        inventoryItemName: `${itemName} from crome`,
        inventoryFloor: InventoryFloor.GROUND_FLOOR,
        inventoryPricePerKg: '',
        inventoryQuantityPc: '',
    });

    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);

    // Helper: Parse numeric string values
    const parseNum = (val: string | number): number => {
        if (typeof val === 'number') return val;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Validation Logic with Business Rules
    const validateField = (name: string, value: any, allData = formData): string | null => {
        const returnStockNum = parseNum(allData.returnStock);
        const packagingWeightNum = parseNum(allData.packagingWeight);
        const packagingCountNum = parseNum(allData.packagingCount);

        switch (name) {
            case 'returnDate':
                if (!value) return 'Return Date is required';
                // Date consistency: Return date >= Crome date
                if (crome.cromeDate && new Date(value) < new Date(crome.cromeDate)) {
                    return 'Return date cannot be before crome date';
                }
                return null;

            case 'returnStock': {
                const valueNum = parseNum(value);
                if (!value || valueNum <= 0) return 'Gross return must be > 0';
                // Over-return prevention: Cannot return more than sent
                const sentStock = crome.sentStock || 0;
                if (valueNum > sentStock) {
                    return `Cannot return more than sent stock (${sentStock.toFixed(3)} Kg)`;
                }
                return null;
            }

            case 'packagingWeight': {
                const valueNum = parseNum(value);
                if (valueNum < 0) return 'Weight must be >= 0';
                // Weight integrity: Total packaging < Gross
                const totalPackaging = valueNum * packagingCountNum;
                if (totalPackaging >= returnStockNum && returnStockNum > 0) {
                    return 'Total packaging weight must be less than gross weight';
                }
                return null;
            }

            case 'packagingCount': {
                const valueNum = parseNum(value);
                if (valueNum < 0) return 'Count must be >= 0';
                // Weight integrity check
                const totalPackaging = packagingWeightNum * valueNum;
                if (totalPackaging >= returnStockNum && returnStockNum > 0) {
                    return 'Total packaging weight must be less than gross weight';
                }
                return null;
            }

            case 'inventoryItemName':
                return allData.addToInventory && !value.trim() ? 'Item Name is required' : null;

            case 'inventoryPricePerKg': {
                const valueNum = parseNum(value);
                if (allData.addToInventory) {
                    if (valueNum < 0) return 'Price cannot be negative';
                    if (valueNum === 0) return 'Price should be greater than 0 when adding to inventory';
                }
                return null;
            }

            case 'inventoryQuantityPc': {
                const valueNum = parseNum(value);
                return allData.addToInventory && valueNum < 0 ? 'Qty cannot be negative' : null;
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
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    // Handle numeric input (text with numeric-only validation)
    const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Allow digits, decimal point, and empty string
        const numericValue = value.replace(/[^0-9.]/g, '');
        // Prevent multiple decimal points
        const parts = numericValue.split('.');
        const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;

        setFormData(prev => ({ ...prev, [name]: cleanValue }));

        // Clear warnings when user edits
        setWarnings([]);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target as HTMLInputElement;
        let processedValue: any = value;

        if (type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        }

        setFormData((prev) => ({
            ...prev,
            [name]: processedValue,
        }));

        // Clear warnings when user edits
        setWarnings([]);
    };

    // Calculate net return stock
    const calculateNetReturn = (): number => {
        const gross = parseNum(formData.returnStock);
        const packagingDeduction = parseNum(formData.packagingWeight) * parseNum(formData.packagingCount);
        return Math.max(0, gross - packagingDeduction);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setWarnings([]);

        // Workflow state protection
        if (crome.status === 'COMPLETED') {
            setError('Cannot add return to a completed order. Please reopen it first.');
            return;
        }

        // Mark all as touched
        const allTouched = Object.keys(formData).reduce((acc, key) => ({ ...acc, [key]: true }), {});
        setTouched(allTouched);

        // Validate all
        const errors = Object.keys(formData).map(key => validateField(key, formData[key as keyof typeof formData])).filter(Boolean);
        if (errors.length > 0) {
            return; // Don't submit if errors
        }

        // Check warnings
        const newWarnings: string[] = [];

        // Future date warning
        if (new Date(formData.returnDate) > new Date()) {
            newWarnings.push('You are recording a return in the future.');
        }

        // Balance check: Auto-suggest completion when all stock returned
        const grossReturnNum = parseNum(formData.returnStock);
        const sentStock = crome.sentStock || 0;
        if (grossReturnNum === sentStock && crome.status === SubcontractingStatus.IN_PROCESS) {
            newWarnings.push('This return completes the order. Consider marking it as "Completed".');
        }

        if (newWarnings.length > 0) {
            setWarnings(newWarnings);
            // Don't block submission, just show warnings
        }

        const submitData: CromeReturnRequest = {
            returnDate: formData.returnDate,
            returnStock: parseNum(formData.returnStock),
            packagingType: formData.packagingType,
            packagingWeight: parseNum(formData.packagingWeight),
            packagingCount: parseNum(formData.packagingCount),
            returnRemark: formData.returnRemark || null,
            addToInventory: formData.addToInventory,
            inventoryItemName: formData.addToInventory ? formData.inventoryItemName : undefined,
            inventoryFloor: formData.addToInventory ? formData.inventoryFloor : undefined,
            inventoryPricePerKg: formData.addToInventory ? parseNum(formData.inventoryPricePerKg) : undefined,
            inventoryQuantityPc: formData.addToInventory ? parseNum(formData.inventoryQuantityPc) : undefined,
        };

        try {
            setLoading(true);
            await onSubmit(submitData);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to record return');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content crome-return-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Record Crome Return</h2>

                <form onSubmit={handleSubmit} className="modal-form" noValidate>
                    <div className="top-section-grid">
                        {/* Left Box: Inventory Details */}
                        <div className="form-section inventory-section">
                            <h3 className="section-subtitle">Inventory Details</h3>

                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="addToInventory"
                                        checked={formData.addToInventory}
                                        onChange={handleChange}
                                    />
                                    Add to Inventory
                                </label>
                            </div>

                            {formData.addToInventory && (
                                <div className="inventory-fields">
                                    <div className="form-group full-width">
                                        <label className="form-label">Item Name</label>
                                        <input
                                            type="text"
                                            name="inventoryItemName"
                                            value={formData.inventoryItemName}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            className={`form-input ${getFieldError('inventoryItemName') ? 'invalid' : ''}`}
                                            placeholder="Item Name"
                                            required={formData.addToInventory}
                                        />
                                        {getFieldError('inventoryItemName') && <span className="field-error-text">{getFieldError('inventoryItemName')}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Price / Kg</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            name="inventoryPricePerKg"
                                            value={formData.inventoryPricePerKg}
                                            onChange={handleNumericInput}
                                            onBlur={handleBlur}
                                            className={`form-input ${getFieldError('inventoryPricePerKg') ? 'invalid' : ''}`}
                                            placeholder="₹ 0.00"
                                        />
                                        {getFieldError('inventoryPricePerKg') && <span className="field-error-text">{getFieldError('inventoryPricePerKg')}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Pieces (Qty)</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            name="inventoryQuantityPc"
                                            value={formData.inventoryQuantityPc}
                                            onChange={handleNumericInput}
                                            onBlur={handleBlur}
                                            className={`form-input ${getFieldError('inventoryQuantityPc') ? 'invalid' : ''}`}
                                            placeholder="0"
                                        />
                                        {getFieldError('inventoryQuantityPc') && <span className="field-error-text">{getFieldError('inventoryQuantityPc')}</span>}
                                    </div>

                                    <div className="form-group full-width">
                                        <label className="form-label">Floor</label>
                                        <select
                                            name="inventoryFloor"
                                            value={formData.inventoryFloor}
                                            onChange={handleChange}
                                            className="form-input"
                                            required={formData.addToInventory}
                                        >
                                            <option value={InventoryFloor.GROUND_FLOOR}>Ground Floor</option>
                                            <option value={InventoryFloor.FIRST_FLOOR}>First Floor</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Box: Basic Return Details */}
                        <div className="form-section return-basics-section">
                            <h3 className="section-subtitle">Return Details</h3>
                            <div className="form-group">
                                <label className="form-label">Return Date:</label>
                                <input
                                    type="date"
                                    name="returnDate"
                                    value={formData.returnDate}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={`form-input ${getFieldError('returnDate') ? 'invalid' : ''}`}
                                    title="Return Date"
                                    required
                                />
                                {getFieldError('returnDate') && <span className="field-error-text">{getFieldError('returnDate')}</span>}
                            </div>

                            <div className="form-group">
                                <label className="form-label">Gross Return (Kg)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    name="returnStock"
                                    value={formData.returnStock}
                                    onChange={handleNumericInput}
                                    onBlur={handleBlur}
                                    className={`form-input ${getFieldError('returnStock') ? 'invalid' : ''}`}
                                    placeholder="Enter return weight"
                                    required
                                />
                                {getFieldError('returnStock') && <span className="field-error-text">{getFieldError('returnStock')}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="divider-line"></div>

                    {/* Full Width Bottom: Packaging Details */}
                    <div className="form-section packaging-section">
                        <h3 className="section-subtitle">Packaging Details</h3>
                        <div className="packaging-grid-wrapper">
                            <div className="packaging-field">
                                <label className="form-label">Type</label>
                                <select
                                    name="packagingType"
                                    value={formData.packagingType}
                                    onChange={handleChange}
                                    className="form-input"
                                    required
                                >
                                    <option value={PackagingType.BAG}>Bag</option>
                                    <option value={PackagingType.FOAM}>Foam</option>
                                    <option value={PackagingType.PETI}>Peti</option>
                                    <option value={PackagingType.DRUM}>Drum</option>
                                </select>
                            </div>
                            <div className="packaging-field">
                                <label className="form-label">Weight (Kg)</label>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    name="packagingWeight"
                                    value={formData.packagingWeight}
                                    onChange={handleNumericInput}
                                    onBlur={handleBlur}
                                    placeholder="Kg"
                                    className={`form-input ${getFieldError('packagingWeight') ? 'invalid' : ''}`}
                                    required
                                />
                                {getFieldError('packagingWeight') && <span className="field-error-text">{getFieldError('packagingWeight')}</span>}
                            </div>
                            <div className="packaging-field">
                                <label className="form-label">Count (Qty)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    name="packagingCount"
                                    value={formData.packagingCount}
                                    onChange={handleNumericInput}
                                    onBlur={handleBlur}
                                    placeholder="Qty"
                                    className={`form-input ${getFieldError('packagingCount') ? 'invalid' : ''}`}
                                    required
                                />
                                {getFieldError('packagingCount') && <span className="field-error-text">{getFieldError('packagingCount')}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="calculation-summary">
                        <div className="calc-row">
                            <span className="calc-label">Gross Return:</span>
                            <span className="calc-value">{parseNum(formData.returnStock).toFixed(3)} Kg</span>
                        </div>
                        <div className="calc-row">
                            <span className="calc-label">Packaging Deduction:</span>
                            <span className="calc-value deduction">- {(parseNum(formData.packagingWeight) * parseNum(formData.packagingCount)).toFixed(3)} Kg</span>
                        </div>
                        <div className="calc-row total-row">
                            <span className="calc-label">Net Return:</span>
                            <span className="calc-value total">{calculateNetReturn().toFixed(3)} Kg</span>
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
                            rows={2}
                        />
                    </div>

                    {warnings.length > 0 && (
                        <div className="warning-message">
                            {warnings.map((warning, idx) => (
                                <div key={idx}>⚠️ {warning}</div>
                            ))}
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    <div className="modal-actions">
                        <button type="submit" className="save-button" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Return'}
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

export default CromeReturnModal;
