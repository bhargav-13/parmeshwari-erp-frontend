import React, { useState, useEffect } from 'react';
import './AddProductModal.css'; // Reusing existing styles
import { partyApi } from '../api/party';

interface ForginDownloadOptionsModalProps {
    onClose: () => void;
    onNext: (partyName: string, startDate: string, endDate: string) => void;
}

const ForginDownloadOptionsModal: React.FC<ForginDownloadOptionsModalProps> = ({ onClose, onNext }) => {
    const [parties, setParties] = useState<{ id: number; name: string }[]>([]);
    const [selectedParty, setSelectedParty] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchParties = async () => {
            try {
                setLoading(true);
                // Assuming getAllParties returns an array of Party objects with 'name' property
                const data = await partyApi.getAllParties();
                // Map to simpler structure if needed, or just use as is
                setParties(data.map(p => ({ id: p.partyId, name: p.name })));
            } catch (err) {
                console.error("Failed to fetch parties", err);
                setError("Failed to load parties");
            } finally {
                setLoading(false);
            }
        };

        fetchParties();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedParty) {
            setError('Please select a party');
            return;
        }
        if (!startDate || !endDate) {
            setError('Please select both start and end dates');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setError('Start date cannot be after end date');
            return;
        }

        onNext(selectedParty, startDate, endDate);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 className="modal-title" style={{ margin: 0 }}>Download Report</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}>&times;</button>
                </div>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label className="form-label">Party Name</label>
                        <select
                            value={selectedParty}
                            onChange={(e) => setSelectedParty(e.target.value)}
                            className="form-input"
                            required
                            disabled={loading}
                        >
                            <option value="">{loading ? 'Loading...' : 'Select Party'}</option>
                            {parties.map((party) => (
                                <option key={party.id} value={party.name}>
                                    {party.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Date Range</label>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>From</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '12px', color: '#666', marginBottom: '4px', display: 'block' }}>To</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="form-input"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="submit" className="save-button" disabled={loading}>
                            {loading ? 'Loading...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ForginDownloadOptionsModal;
