import React, { useState } from 'react';
import './AddProductModal.css'; // Reuse existing modal styles

interface CastingEntry {
    date: string;
    mell: number;
    brass: number;
}

interface AddCastingEntryModalProps {
    onClose: () => void;
    onSuccess: (entry: CastingEntry) => void;
}

const AddCastingEntryModal: React.FC<AddCastingEntryModalProps> = ({ onClose, onSuccess }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [mell, setMell] = useState<number | ''>('');
    const [brass, setBrass] = useState<number | ''>('');
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

        // Allow 0 values, but require fields to be filled (not empty string)
        if (mell === '' || brass === '') {
            setError('Mell and Brass values are required');
            return;
        }

        try {
            setLoading(true);
            // Simulate API delay needed? Maybe not for local state, but keeps UI consistent
            await new Promise(resolve => setTimeout(resolve, 300));

            const newEntry: CastingEntry = {
                date, // Keep YYYY-MM-DD format as is, or format it? The mock data was DD/MM/YYYY. Let's keep it simple or format it.
                // Mock data used DD/MM/YYYY. Let's try to match that for consistency in display.
                mell: Number(mell),
                brass: Number(brass),
            };

            // Simple date formatting to DD/MM/YYYY for display match
            const [year, month, day] = date.split('-');
            const formattedEntry = {
                ...newEntry,
                date: `${day}/${month}/${year}`
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
                <h2 className="modal-title">Add Casting Entry</h2>

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
                        <label className="form-label">Mell*</label>
                        <input
                            type="number"
                            value={mell}
                            onChange={(e) => setMell(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Enter Mell Value"
                            className="form-input"
                            required
                            step="0.001"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Brass*</label>
                        <input
                            type="number"
                            value={brass}
                            onChange={(e) => setBrass(e.target.value === '' ? '' : Number(e.target.value))}
                            placeholder="Enter Brass Value"
                            className="form-input"
                            required
                            step="0.001"
                        />
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

export default AddCastingEntryModal;
