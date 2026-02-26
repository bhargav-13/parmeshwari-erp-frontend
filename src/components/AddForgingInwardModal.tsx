import React, { useState, useEffect } from 'react';
import './AddProductModal.css';
import type { ForgingInward, ForgingParty, InwardWeightUnit } from '../types';
import { forgingPartyApi } from '../api/forging';
import { partyApi } from '../api/party';

const INWARD_WEIGHT_UNITS: { value: InwardWeightUnit; label: string }[] = [
    { value: 'KG', label: 'KG' },
    { value: 'CHHOL', label: 'Chhol' },
    { value: 'TAIYAR MAAL', label: 'Taiyar Maal' },
];

interface AddForgingInwardModalProps {
    onClose: () => void;
    onSuccess: (entry: Omit<ForgingInward, 'id'>) => void;
}

const AddForgingInwardModal: React.FC<AddForgingInwardModalProps> = ({ onClose, onSuccess }) => {
    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [partyId, setPartyId] = useState<number | ''>('');
    const [challanNo, setChallanNo] = useState('');
    const [weight, setWeight] = useState<number | ''>('');
    const [weightUnit, setWeightUnit] = useState<InwardWeightUnit>('KG');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Parties state
    const [parties, setParties] = useState<ForgingParty[]>([]);
    const [partiesLoading, setPartiesLoading] = useState(true);

    // Add new party state
    const [showAddParty, setShowAddParty] = useState(false);
    const [newPartyName, setNewPartyName] = useState('');
    const [addingParty, setAddingParty] = useState(false);

    useEffect(() => {
        fetchParties();
    }, []);

    const fetchParties = async () => {
        try {
            setPartiesLoading(true);
            const data = await forgingPartyApi.getAll();
            setParties(data);
        } catch (err) {
            console.error('Failed to fetch parties:', err);
        } finally {
            setPartiesLoading(false);
        }
    };

    const handleAddParty = async () => {
        if (!newPartyName.trim()) return;

        try {
            setAddingParty(true);
            const newParty = await partyApi.createParty({
                name: newPartyName.trim(),
                officialAmount: 0,
                offlineAmount: 0
            });

            // Refresh parties list
            const data = await forgingPartyApi.getAll();
            setParties(data);

            // Select the newly created party
            setPartyId(newParty.partyId);
            setNewPartyName('');
            setShowAddParty(false);
        } catch (err) {
            console.error('Failed to add party:', err);
            setError('Failed to add party');
        } finally {
            setAddingParty(false);
        }
    };

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

            // Format date to DD/MM/YYYY for the UI/API consistency
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
            <div className="modal-content small-modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Add Forging Inward Entry</h2>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="modal-form">
                    {/* Row 1: Date, Party Name, Challan No */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Date*</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>

                        <div className="form-group" style={{ flex: 2 }}>
                            <label className="form-label">Party Name*</label>
                            <div className="dropdown-with-add" style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    value={partyId}
                                    onChange={(e) => setPartyId(e.target.value === '' ? '' : Number(e.target.value))}
                                    className="form-input"
                                    required
                                    disabled={partiesLoading || showAddParty}
                                    style={{ flex: 1 }}
                                >
                                    <option value="">{partiesLoading ? 'Loading...' : 'Select Party'}</option>
                                    {parties.map((party) => (
                                        <option key={party.partyId} value={party.partyId}>
                                            {party.partyName}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="add-new-btn"
                                    onClick={() => setShowAddParty(!showAddParty)}
                                    title="Add new party"
                                    style={{ padding: '0 12px', fontSize: '20px' }}
                                >
                                    {showAddParty ? '×' : '+'}
                                </button>
                            </div>
                            {showAddParty && (
                                <div className="add-new-input-group" style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <input
                                        type="text"
                                        value={newPartyName}
                                        onChange={(e) => setNewPartyName(e.target.value)}
                                        placeholder="Enter party name"
                                        className="form-input"
                                        style={{ flex: 1 }}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParty())}
                                    />
                                    <button
                                        type="button"
                                        className="add-confirm-btn"
                                        onClick={handleAddParty}
                                        disabled={addingParty || !newPartyName.trim()}
                                    >
                                        {addingParty ? '...' : 'Add'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">Challan No*</label>
                            <input
                                type="text"
                                value={challanNo}
                                onChange={(e) => setChallanNo(e.target.value)}
                                placeholder="Challan No"
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    {/* Row 2: Weight and Weight Unit */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                        <div className="form-group" style={{ flex: 1 }}>
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

                        <div className="form-group" style={{ flex: 1 }}>
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
