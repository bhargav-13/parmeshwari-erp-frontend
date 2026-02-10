import React, { useState } from 'react';
import './AddProductModal.css'; // Reusing existing styles for consistency

export interface ElectricCreditEntry {
    date: string;
    challanNo: string;
    kg: number;
    unit: string;
    rate: number;
}

interface AddElectricCreditModalProps {
    onClose: () => void;
    onSuccess: (entry: ElectricCreditEntry) => void;
}

const AddElectricCreditModal: React.FC<AddElectricCreditModalProps> = ({ onClose, onSuccess }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [challanNo, setChallanNo] = useState('');
    const [kg, setKg] = useState<number | ''>('');
    const [unit, setUnit] = useState('Kg'); // Default unit
    const [rate, setRate] = useState<number | ''>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!challanNo.trim()) {
            setError('Challan No. is required');
            return;
        }
        if (!kg || Number(kg) <= 0) {
            setError('Valid KG amount is required');
            return;
        }
        if (!rate || Number(rate) <= 0) {
            setError('Valid Rate is required');
            return;
        }

        try {
            setLoading(true);
            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            const newEntry: ElectricCreditEntry = {
                date,
                challanNo: challanNo.trim(),
                kg: Number(kg),
                unit,
                rate: Number(rate),
            };

            onSuccess(newEntry);
            onClose();
        } catch (err) {
            console.error("Error saving credit entry:", err);
            setError('Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Add Credit Entry</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="form-input"
                            required
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Challan No.</label>
                            <input
                                type="text"
                                value={challanNo}
                                onChange={(e) => setChallanNo(e.target.value)}
                                placeholder="Enter Challan No."
                                className="form-input"
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">KG</label>
                            <input
                                type="number"
                                value={kg}
                                onChange={(e) => setKg(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter Weight"
                                className="form-input"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Rate</label>
                            <input
                                type="number"
                                value={rate}
                                onChange={(e) => setRate(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter Rate"
                                className="form-input"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Unit</label>
                            <select
                                value={unit}
                                onChange={(e) => setUnit(e.target.value)}
                                className="form-input"
                            >
                                <option value="Kg">Kg</option>
                                <option value="Pcs">Pcs</option>
                                <option value="Box">Box</option>
                            </select>
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

export default AddElectricCreditModal;
