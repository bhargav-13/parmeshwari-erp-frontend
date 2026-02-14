import React, { useState } from 'react';
import './AddProductModal.css';
import type { ForgingOutward, WeightUnit } from '../types';

interface AddForgingOutwardModalProps {
    onClose: () => void;
    onSuccess: (entry: Omit<ForgingOutward, 'id'>) => void;
}

const AddForgingOutwardModal: React.FC<AddForgingOutwardModalProps> = ({ onClose, onSuccess }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [partyName, setPartyName] = useState('');
    const [challanNo, setChallanNo] = useState('');
    const [weight, setWeight] = useState<number | ''>('');
    const [weightUnit, setWeightUnit] = useState<WeightUnit>('KG');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!date || !partyName || !challanNo || weight === '') {
            setError('All fields are required');
            return;
        }

        try {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 300));

            // Format date to DD/MM/YYYY
            const [year, month, day] = date.split('-');
            const formattedEntry: Omit<ForgingOutward, 'id'> = {
                partyName,
                challanNo,
                date: `${day}/${month}/${year}`,
                weight: Number(weight),
                weightUnit,
            };

            onSuccess(formattedEntry);
            onClose();
        } catch (err: any) {
            console.error("Error saving entry:", err);
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
                        <label className="form-label">Date*</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Party Name*</label>
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
                        <label className="form-label">Challan No*</label>
                        <input
                            type="text"
                            value={challanNo}
                            onChange={(e) => setChallanNo(e.target.value)}
                            placeholder="Enter Challan Number"
                            className="form-input"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Weight*</label>
                        <input
                            type="number"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Enter Weight"
                            className="form-input"
                            required
                            step="0.001"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Weight Unit*</label>
                        <select
                            value={weightUnit}
                            onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                            className="form-input"
                            required
                        >
                            <option value="KG">KG</option>
                            <option value="CHHOL">CHHOL</option>
                            <option value="WIRE">WIRE</option>
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

export default AddForgingOutwardModal;
