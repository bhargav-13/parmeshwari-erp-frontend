import React, { useState, useEffect } from 'react';
import type { CromeReturnRequest, Crome, PackagingDetail, Product } from '../types';
import { PackagingType, InventoryFloor, SubcontractingStatus, QuantityUnit } from '../types';
import { cromeApi } from '../api/crome';
import { stockItemApi, productApi } from '../api/inventory';
import './CromeReturnModal.css';

// Packaging weights in KG
const PACKAGING_WEIGHTS_KG: Record<PackagingType, number | null> = {
    [PackagingType.BAG]: 0.075,
    [PackagingType.FOAM]: 0.150,
    [PackagingType.PETI]: 1.200,
    [PackagingType.DRUM]: null,
};

interface PackagingFormRow {
    packagingType: PackagingType;
    packagingWeight: string; // KG
    packagingCount: string;
}

interface CromeReturnModalProps {
    cromeId: number;
    itemName: string;
    crome: Crome;
    onClose: () => void;
    onSubmit: (data: CromeReturnRequest) => Promise<void>;
}

const createDefaultPackaging = (): PackagingFormRow => ({
    packagingType: PackagingType.PETI,
    packagingWeight: '1.2',
    packagingCount: '',
});

/** Reads a piece weight from names like "TURBO 50 GM" or "A/C BODY 0.09 KG" → weight in kg. */
const parseWeightPerPcKgFromName = (name: string): number | null => {
    const match = name.match(/(\d+(?:\.\d+)?)\s*(GM|GMS|GRAM|G|KG)\b/i);
    if (!match) return null;
    const value = parseFloat(match[1]);
    if (!value) return null;
    return match[2].toUpperCase() === 'KG' ? value : value / 1000;
};

/** Pre-fills the return with what was sent: same packaging as the crome dispatch. */
const initialPackagings = (crome: Crome): PackagingFormRow[] =>
    crome.packagings && crome.packagings.length > 0
        ? crome.packagings.map(p => ({
            packagingType: p.packagingType,
            packagingWeight: String(p.packagingWeight ?? ''),
            packagingCount: String(p.packagingCount ?? ''),
        }))
        : [createDefaultPackaging()];

/** Pre-fills gross return with the gross weight that was sent (sent stock + packaging). */
const initialGross = (crome: Crome): string => {
    const gross = crome.grossWeight || crome.sentStock;
    return gross ? String(Math.round(gross * 1000) / 1000) : '';
};

const CromeReturnModal: React.FC<CromeReturnModalProps> = ({ itemName, crome, onClose, onSubmit }) => {
    const [formData, setFormData] = useState<{
        returnDate: string;
        returnStock: string;
        quantityInPc: string;
        packagings: PackagingFormRow[];
        returnRemark: string;
        addToInventory: boolean;
        inventoryItemName: string;
        inventoryFloor: InventoryFloor;
    }>({
        returnDate: new Date().toISOString().split('T')[0],
        returnStock: initialGross(crome),
        quantityInPc: '',
        packagings: initialPackagings(crome),
        returnRemark: '',
        addToInventory: true,
        inventoryItemName: itemName,
        inventoryFloor: InventoryFloor.GROUND_FLOOR,
    });

    const [pricePerKg, setPricePerKg] = useState<number>(0);
    const [loadingPrice, setLoadingPrice] = useState(true);
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [warnings, setWarnings] = useState<string[]>([]);
    // Weight of one piece in kg, used to auto-fill Pieces: from the existing stock item, else the item name
    const [weightPerPcKg, setWeightPerPcKg] = useState<number | null>(null);
    // Once the user types Pieces themselves, stop overwriting it
    const [pcsEdited, setPcsEdited] = useState(false);
    // Pieces already in the stock row this return goes into (null = no stock row yet)
    const [stockPcs, setStockPcs] = useState<number | null>(null);
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        productApi.getProducts().then(setProducts).catch(() => setProducts([]));
    }, []);

    // Item name suggestions: only products of the chosen floor (no floor yet = First Floor)
    const floorProductNames = products
        .filter(p => (p.floor ?? 'FIRST_FLOOR') === formData.inventoryFloor)
        .map(p => p.productName);

    useEffect(() => {
        const fetchPrice = async () => {
            try {
                setLoadingPrice(true);
                const info = await cromeApi.getSubcontractingCromeInfo(crome.subcontractingId);
                setPricePerKg(info.price + info.jobWorkPay + (crome.cromeAmount ?? 0));
            } catch (err) {
                console.error('Error fetching subcontracting price:', err);
            } finally {
                setLoadingPrice(false);
            }
        };
        fetchPrice();
    }, [crome.subcontractingId, crome.cromeAmount]);

    useEffect(() => {
        const name = formData.inventoryItemName.trim().toLowerCase();
        let cancelled = false;
        stockItemApi
            .getAllStockItems()
            .then(items => {
                if (cancelled) return;
                // Same item on the chosen floor — that's the stock row the return will be added to
                const match = items.find(i =>
                    i.product?.productName?.trim().toLowerCase() === name &&
                    (i.inventoryFloor ?? InventoryFloor.GROUND_FLOOR) === formData.inventoryFloor
                );
                setStockPcs(match ? (match.quantityInPc ?? 0) : null);
                if (match && match.weightPerPc > 0) {
                    setWeightPerPcKg(match.quantityUnit === QuantityUnit.GM ? match.weightPerPc / 1000 : match.weightPerPc);
                } else {
                    setWeightPerPcKg(parseWeightPerPcKgFromName(formData.inventoryItemName));
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setWeightPerPcKg(parseWeightPerPcKgFromName(formData.inventoryItemName));
                    setStockPcs(null);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [formData.inventoryItemName, formData.inventoryFloor]);

    const parseNum = (val: string | number): number => {
        if (typeof val === 'number') return val;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    };

    // Calculate total packaging deduction in KG across all rows
    const getTotalPackagingDeductionKg = (packagings: PackagingFormRow[]): number => {
        return packagings.reduce((sum, row) => {
            return sum + (parseNum(row.packagingWeight) * parseNum(row.packagingCount));
        }, 0);
    };

    // Packaging row handlers
    const handlePackagingChange = (index: number, field: keyof PackagingFormRow, value: string) => {
        const updated = [...formData.packagings];
        updated[index] = { ...updated[index], [field]: value };
        setFormData(prev => ({ ...prev, packagings: updated }));
        setWarnings([]);
    };

    const handlePackagingTypeChange = (index: number, value: PackagingType) => {
        const updated = [...formData.packagings];
        const weight = PACKAGING_WEIGHTS_KG[value];
        updated[index] = {
            ...updated[index],
            packagingType: value,
            packagingWeight: weight !== null ? weight.toString() : updated[index].packagingWeight,
        };
        setFormData(prev => ({ ...prev, packagings: updated }));
        setWarnings([]);
    };

    const addPackagingRow = () => {
        setFormData(prev => ({
            ...prev,
            packagings: [...prev.packagings, createDefaultPackaging()],
        }));
    };

    const removePackagingRow = (index: number) => {
        if (formData.packagings.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            packagings: prev.packagings.filter((_, i) => i !== index),
        }));
    };

    const validateField = (name: string, value: any, allData = formData): string | null => {
        switch (name) {
            case 'returnDate':
                if (!value) return 'Return Date is required';
                if (crome.cromeDate && new Date(value) < new Date(crome.cromeDate)) {
                    return 'Return date cannot be before crome date';
                }
                return null;

            case 'returnStock': {
                const valueNum = parseNum(value);
                if (!value || valueNum <= 0) return 'Gross return must be > 0';

                const packagingDeduction = getTotalPackagingDeductionKg(allData.packagings);
                const netReturn = valueNum - packagingDeduction;

                const sentStock = crome.sentStock || 0;
                if (netReturn > sentStock) {
                    return `Net return (${netReturn.toFixed(3)}) cannot exceed sent stock (${sentStock.toFixed(3)} Kg)`;
                }
                return null;
            }

            case 'inventoryItemName':
                return allData.addToInventory && !value.trim() ? 'Item Name is required' : null;

            default:
                return null;
        }
    };

    const validatePackagingRow = (row: PackagingFormRow, allData = formData): string | null => {
        const weightNum = parseNum(row.packagingWeight);
        const countNum = parseNum(row.packagingCount);

        if (weightNum < 0) return 'Weight must be >= 0';
        if (countNum < 0) return 'Count must be >= 0';

        const returnStockNum = parseNum(allData.returnStock);
        const totalPackaging = getTotalPackagingDeductionKg(allData.packagings);
        if (totalPackaging >= returnStockNum && returnStockNum > 0) {
            return 'Total packaging weight must be less than gross weight';
        }
        return null;
    };

    const getFieldError = (name: string) => {
        if (!touched[name]) return null;
        return validateField(name, formData[name as keyof typeof formData]);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const handleNumericInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numericValue = value.replace(/[^0-9.]/g, '');
        const parts = numericValue.split('.');
        const cleanValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : numericValue;

        setFormData(prev => ({ ...prev, [name]: cleanValue }));
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

        setWarnings([]);
    };

    // Calculate net return stock
    const calculateNetReturn = (): number => {
        const gross = parseNum(formData.returnStock);
        const packagingDeduction = getTotalPackagingDeductionKg(formData.packagings);
        return Math.max(0, gross - packagingDeduction);
    };

    const autoPcs = weightPerPcKg ? Math.floor(calculateNetReturn() / weightPerPcKg + 1e-9) : 0;

    useEffect(() => {
        if (!pcsEdited) {
            setFormData(prev => ({ ...prev, quantityInPc: autoPcs > 0 ? String(autoPcs) : '' }));
        }
    }, [autoPcs, pcsEdited]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setWarnings([]);

        if (crome.status === 'COMPLETED') {
            setError('Cannot add return to a completed order. Please reopen it first.');
            return;
        }

        // Mark all as touched
        const allTouched: Record<string, boolean> = {};
        Object.keys(formData).forEach(key => { allTouched[key] = true; });
        formData.packagings.forEach((_, i) => { allTouched[`packaging_${i}`] = true; });
        setTouched(allTouched);

        // Validate all
        const fieldErrors = ['returnDate', 'returnStock', 'inventoryItemName']
            .map(key => validateField(key, formData[key as keyof typeof formData]))
            .filter(Boolean);
        const packagingErrors = formData.packagings.map(row => validatePackagingRow(row)).filter(Boolean);

        if (fieldErrors.length > 0 || packagingErrors.length > 0) {
            return;
        }

        // Check warnings
        const newWarnings: string[] = [];
        if (new Date(formData.returnDate) > new Date()) {
            newWarnings.push('You are recording a return in the future.');
        }

        const netReturnNum = calculateNetReturn();
        const sentStock = crome.sentStock || 0;
        if (Math.abs(netReturnNum - sentStock) < 0.001 && crome.status === SubcontractingStatus.IN_PROCESS) {
            newWarnings.push('This return completes the order. Consider marking it as "Completed".');
        }

        if (newWarnings.length > 0) {
            setWarnings(newWarnings);
        }

        const packagings: PackagingDetail[] = formData.packagings.map(row => ({
            packagingType: row.packagingType,
            packagingWeight: parseNum(row.packagingWeight),
            packagingCount: parseNum(row.packagingCount),
        }));

        const submitData: CromeReturnRequest = {
            returnDate: formData.returnDate,
            returnStock: parseNum(formData.returnStock),
            packagings,
            rate: pricePerKg,
            returnRemark: formData.returnRemark || null,
            addToInventory: formData.addToInventory,
            inventoryItemName: formData.addToInventory ? formData.inventoryItemName : undefined,
            inventoryFloor: formData.addToInventory ? formData.inventoryFloor : undefined,
            inventoryPricePerKg: formData.addToInventory ? pricePerKg : undefined,
            inventoryQuantityPc:
                formData.addToInventory && parseNum(formData.quantityInPc) > 0
                    ? parseNum(formData.quantityInPc)
                    : undefined,
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
                                            list="crome-return-floor-products"
                                            value={formData.inventoryItemName}
                                            onChange={handleChange}
                                            onBlur={handleBlur}
                                            className={`form-input ${getFieldError('inventoryItemName') ? 'invalid' : ''}`}
                                            placeholder="Item Name"
                                            required={formData.addToInventory}
                                        />
                                        <datalist id="crome-return-floor-products">
                                            {floorProductNames.map(name => <option key={name} value={name} />)}
                                        </datalist>
                                        {getFieldError('inventoryItemName') && <span className="field-error-text">{getFieldError('inventoryItemName')}</span>}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Price / Kg (Rate + Job Work + Crome)</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={loadingPrice ? 'Loading...' : `₹ ${pricePerKg.toFixed(2)}`}
                                            readOnly
                                            disabled
                                            title="Rate + Job Work Pay + Crome Amount per Kg"
                                        />
                                    </div>

                                    <div className="form-group full-width">
                                        <label className="form-label">Floor</label>
                                        <select
                                            name="inventoryFloor"
                                            value={formData.inventoryFloor}
                                            onChange={handleChange}
                                            className="form-input"
                                            title="Inventory floor"
                                            required={formData.addToInventory}
                                        >
                                            <option value={InventoryFloor.GROUND_FLOOR}>Ground Floor</option>
                                            <option value={InventoryFloor.FIRST_FLOOR}>First Floor</option>
                                        </select>
                                    </div>

                                    <div className="form-group full-width">
                                        <label className="form-label">Pieces (Pcs)</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            name="quantityInPc"
                                            value={formData.quantityInPc}
                                            onChange={(e) => {
                                                setPcsEdited(true);
                                                setFormData(prev => ({ ...prev, quantityInPc: e.target.value.replace(/[^0-9]/g, '') }));
                                            }}
                                            className="form-input"
                                            placeholder="Enter pieces"
                                            title="Pieces added to inventory"
                                        />
                                        <span className="field-hint-text">
                                            {weightPerPcKg
                                                ? `Suggested: Net ÷ ${Number((weightPerPcKg * 1000).toFixed(2))} gm per pc`
                                                : 'Piece weight unknown, enter pieces manually'}
                                            {pcsEdited && autoPcs > 0 && (
                                                <>
                                                    {' · '}
                                                    <button
                                                        type="button"
                                                        className="link-button"
                                                        onClick={() => setPcsEdited(false)}
                                                    >
                                                        reset to {autoPcs.toLocaleString('en-IN')}
                                                    </button>
                                                </>
                                            )}
                                        </span>
                                        {stockPcs !== null && parseNum(formData.quantityInPc) > 0 && (
                                            <span className="field-hint-text">
                                                In stock {stockPcs.toLocaleString('en-IN')} pcs + {parseNum(formData.quantityInPc).toLocaleString('en-IN')} = <strong>{(stockPcs + parseNum(formData.quantityInPc)).toLocaleString('en-IN')} pcs</strong>
                                            </span>
                                        )}
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
                                <span className="field-hint-text">
                                    Auto-filled with sent gross ({(crome.grossWeight || crome.sentStock || 0).toFixed(3)} Kg), edit if different
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="divider-line"></div>

                    {/* Full Width Bottom: Packaging Details */}
                    <div className="form-section packaging-section">
                        <div className="packaging-list-header">
                            <h3 className="section-subtitle packaging-subtitle">Packaging Details</h3>
                            <button type="button" className="add-packaging-btn" onClick={addPackagingRow} title="Add packaging">
                                +
                            </button>
                        </div>

                        {formData.packagings.map((row, index) => {
                            const rowError = touched[`packaging_${index}`] ? validatePackagingRow(row) : null;
                            return (
                                <div key={index} className="packaging-list-row">
                                    <div className="packaging-grid-wrapper">
                                        <div className="packaging-field">
                                            {index === 0 && <label className="form-label">Type</label>}
                                            <select
                                                value={row.packagingType}
                                                onChange={(e) => handlePackagingTypeChange(index, e.target.value as PackagingType)}
                                                className="form-input"
                                                title="Packaging type"
                                                required
                                            >
                                                <option value={PackagingType.BAG}>Bag</option>
                                                <option value={PackagingType.FOAM}>Foam</option>
                                                <option value={PackagingType.PETI}>Peti</option>
                                                <option value={PackagingType.DRUM}>Drum</option>
                                            </select>
                                        </div>
                                        <div className="packaging-field">
                                            {index === 0 && <label className="form-label">Weight (Kg)</label>}
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={row.packagingWeight}
                                                onChange={(e) => {
                                                    const v = e.target.value.replace(/[^0-9.]/g, '');
                                                    const parts = v.split('.');
                                                    handlePackagingChange(index, 'packagingWeight', parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : v);
                                                }}
                                                onBlur={() => setTouched(prev => ({ ...prev, [`packaging_${index}`]: true }))}
                                                placeholder="Kg"
                                                title="Packaging weight"
                                                className={`form-input ${rowError ? 'invalid' : ''}`}
                                                required
                                                disabled={row.packagingType !== PackagingType.DRUM}
                                            />
                                        </div>
                                        <div className="packaging-field">
                                            {index === 0 && <label className="form-label">Count (Qty)</label>}
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={row.packagingCount}
                                                onChange={(e) => {
                                                    const v = e.target.value.replace(/[^0-9]/g, '');
                                                    handlePackagingChange(index, 'packagingCount', v);
                                                }}
                                                onBlur={() => setTouched(prev => ({ ...prev, [`packaging_${index}`]: true }))}
                                                placeholder="Qty"
                                                title="Packaging count"
                                                className={`form-input ${rowError ? 'invalid' : ''}`}
                                                required
                                            />
                                        </div>
                                        {formData.packagings.length > 1 && (
                                            <div className="packaging-field packaging-remove-field">
                                                {index === 0 && <label className="form-label">&nbsp;</label>}
                                                <button type="button" className="remove-packaging-btn" onClick={() => removePackagingRow(index)} title="Remove packaging">
                                                    -
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    {rowError && <span className="field-error-text">{rowError}</span>}
                                </div>
                            );
                        })}
                    </div>

                    <div className="calculation-summary">
                        <div className="calc-row">
                            <span className="calc-label">Gross Return:</span>
                            <span className="calc-value">{parseNum(formData.returnStock).toFixed(3)} Kg</span>
                        </div>
                        <div className="calc-row">
                            <span className="calc-label">Packaging Deduction:</span>
                            <span className="calc-value deduction">- {getTotalPackagingDeductionKg(formData.packagings).toFixed(3)} Kg</span>
                        </div>
                        <div className="calc-row total-row">
                            <span className="calc-label">Net Return:</span>
                            <span className="calc-value total">{calculateNetReturn().toFixed(3)} Kg</span>
                        </div>
                        <div className="calc-row">
                            <span className="calc-label">Net Return (Pcs):</span>
                            <span className="calc-value">
                                {parseNum(formData.quantityInPc) > 0
                                    ? `${parseNum(formData.quantityInPc).toLocaleString('en-IN')} Pcs`
                                    : '—'}
                            </span>
                        </div>
                        <div className="calc-row pricing-separator">
                            <span className="calc-label">Rate (Price/Kg):</span>
                            <span className="calc-value">{loadingPrice ? '...' : `₹ ${pricePerKg.toFixed(2)}`}</span>
                        </div>
                        <div className="calc-row total-row">
                            <span className="calc-label">Amount:</span>
                            <span className="calc-value total">₹ {(calculateNetReturn() * pricePerKg).toFixed(2)}</span>
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
