import React, { useState } from 'react';
import './AddProductModal.css';

export interface ElectricOutwardEntry {
    date: string;
    challanNo: string;
    unitKg: number;
    unitPrice: number;
    kgPrice: number;
}

interface AddElectricOutwardModalProps {
    onClose: () => void;
    onSuccess: (entry: ElectricOutwardEntry) => void;
}

const AddElectricOutwardModal: React.FC<AddElectricOutwardModalProps> = ({ onClose, onSuccess }) => {
    const [date, setDate] = useState('');
    const [challanNo, setChallanNo] = useState('');
    const [unitKg, setUnitKg] = useState<number | ''>('');
    const [unitPrice, setUnitPrice] = useState<number | ''>('');
    const [kgPrice, setKgPrice] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!date) {
            setError('Date is required');
            return;
        }
        if (!challanNo.trim()) {
            setError('Challan No. is required');
            return;
        }

        try {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));

            const newEntry: ElectricOutwardEntry = {
                date,
                challanNo: challanNo.trim(),
                unitKg: Number(unitKg) || 0,
                unitPrice: Number(unitPrice) || 0,
                kgPrice: Number(kgPrice) || 0,
            };

            onSuccess(newEntry);
            onClose();
        } catch (err) {
            console.error("Error saving outward entry:", err);
            setError('Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Electric Order add</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Row 1: Date, Challan No. */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Challan No.</label>
                            <input
                                type="text"
                                value={challanNo}
                                onChange={(e) => setChallanNo(e.target.value)}
                                placeholder="Enter Challan No."
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    {/* Row 2: Unit Kg, Unit Price, Kg Price */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Unit Kg</label>
                            <input
                                type="number"
                                value={unitKg}
                                onChange={(e) => setUnitKg(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter Unit Kg"
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Unit Price</label>
                            <input
                                type="number"
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter Unit Price"
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Kg Price</label>
                            <input
                                type="number"
                                value={kgPrice}
                                onChange={(e) => setKgPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter Kg Price"
                                className="form-input"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>

                    {/* Row 3: Process (read-only) */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Process</label>
                            <input
                                type="text"
                                value="Outward"
                                className="form-input"
                                readOnly
                                style={{ backgroundColor: '#f0f4f8', color: '#6c757d' }}
                            />
                        </div>
                    </div>

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

export default AddElectricOutwardModal;
