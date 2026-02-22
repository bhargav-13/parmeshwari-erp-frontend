import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import type { ForgingInward, ForgingParty, InwardWeightUnit } from '../types';
import { forgingPartyApi } from '../api/forging';

interface AddForgingInwardModalProps {
    onClose: () => void;
    onSuccess: (entry: Omit<ForgingInward, 'id'>) => void;
}

const INWARD_WEIGHT_UNITS: { value: InwardWeightUnit; label: string }[] = [
    { value: 'CHHOL', label: 'Chhol' },
    { value: 'KG', label: 'KG' },
    { value: 'TAIYAR MAAL', label: 'Taiyar Maal' },
];

const AddForgingInwardModal: React.FC<AddForgingInwardModalProps> = ({ onClose, onSuccess }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [partyId, setPartyId] = useState<number | ''>('');
    const [challanNo, setChallanNo] = useState('');
    const [weight, setWeight] = useState<number | ''>('');
    const [weightUnit, setWeightUnit] = useState<InwardWeightUnit>('KG');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Party dropdown state
    const [parties, setParties] = useState<ForgingParty[]>([]);
    const [partiesLoading, setPartiesLoading] = useState(true);

    useEffect(() => {
        forgingPartyApi.getAll()
            .then(setParties)
            .catch(() => setParties([]))
            .finally(() => setPartiesLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setError(null);

        if (!date || !partyId || !challanNo || weight === '') {
            setError('All fields are required');
            return;
        }

        const selectedParty = parties.find(p => p.partyId === partyId);

        try {
            setLoading(true);

            // Format date to DD/MM/YYYY
            const [year, month, day] = date.split('-');
            const formattedEntry: Omit<ForgingInward, 'id'> = {
                partyId: Number(partyId),
                partyName: selectedParty?.partyName || '',
                challanNo,
                date: `${day}/${month}/${year}`,
                weight: Number(weight),
                weightUnit,
            };

            onSuccess(formattedEntry);
            onClose();
        } catch (err: any) {
            console.error('Error saving entry:', err);
            setError('Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Add Forging Inward Entry</h2>

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
                        <label className="form-label">Party*</label>
                        <select
                            value={partyId}
                            onChange={(e) => setPartyId(e.target.value === '' ? '' : Number(e.target.value))}
                            className="form-input"
                            required
                            disabled={partiesLoading}
                        >
                            <option value="">
                                {partiesLoading ? 'Loading parties...' : '— Select Party —'}
                            </option>
                            {parties.map(p => (
                                <option key={p.partyId} value={p.partyId}>
                                    {p.partyName}
                                </option>
                            ))}
                        </select>
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
                            min="0"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Weight Unit*</label>
                        <select
                            value={weightUnit}
                            onChange={(e) => setWeightUnit(e.target.value as InwardWeightUnit)}
                            className="form-input"
                            required
                        >
                            {INWARD_WEIGHT_UNITS.map(u => (
                                <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="save-button" disabled={loading || partiesLoading}>
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

export default AddForgingInwardModal;
