import React, { useState } from 'react';
import './AddProductModal.css'; // Reusing existing styles

export interface ForginOutwardEntry {
    date: string;
    partyName: string;
    challanNo: string;
    price: number;
    weight: number;
    unit: string;
}

interface AddForginOutwardModalProps {
    onClose: () => void;
    onSuccess: (entry: ForginOutwardEntry) => void;
}

const AddForginOutwardModal: React.FC<AddForginOutwardModalProps> = ({ onClose, onSuccess }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [partyName, setPartyName] = useState('');
    const [challanNo, setChallanNo] = useState('');
    const [price, setPrice] = useState<number | ''>('');
    const [weight, setWeight] = useState<number | ''>('');
    const [unit, setUnit] = useState('Kg');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!partyName.trim()) {
            setError('Party Name is required');
            return;
        }
        if (!challanNo.trim()) {
            setError('Challan No. is required');
            return;
        }
        if (!price || Number(price) <= 0) {
            setError('Valid Price is required');
            return;
        }
        if (!weight || Number(weight) <= 0) {
            setError('Valid Weight is required');
            return;
        }

        try {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 500));

            const newEntry: ForginOutwardEntry = {
                date,
                partyName: partyName.trim(),
                challanNo: challanNo.trim(),
                price: Number(price),
                weight: Number(weight),
                unit,
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
                <h2 className="modal-title">Add Forging Outward Entry</h2>

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

                    <div className="form-group">
                        <label className="form-label">Party Name</label>
                        <input
                            type="text"
                            value={partyName}
                            onChange={(e) => setPartyName(e.target.value)}
                            placeholder="Enter Party Name"
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-group">
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

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Price</label>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter Price"
                                className="form-input"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Weight</label>
                            <input
                                type="number"
                                value={weight}
                                onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="Enter Weight"
                                className="form-input"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
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

export default AddForginOutwardModal;
