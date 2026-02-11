import React, { useState, useEffect } from 'react';
import './AddProductModal.css'; // Reuse existing modal styles
// We might need specific styles, but let's try to reuse generic ones and add inline or new classes if needed.
import './AddCastingSellModal.css';

interface SellEntry {
    date: string;
    kadi: number | null;
    kadiRate: number | null;
    kadiAmount: number | null;
    lokhand: number | null;
    lokhandRate: number | null;
    lokhandAmount: number | null;
    ok: boolean;
}

interface AddCastingSellModalProps {
    onClose: () => void;
    onSuccess: (entry: SellEntry) => void;
}

const AddCastingSellModal: React.FC<AddCastingSellModalProps> = ({ onClose, onSuccess }) => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    // Kadi State
    const [kadi, setKadi] = useState<number | ''>('');
    const [kadiRate, setKadiRate] = useState<number | ''>('');
    const [kadiAmount, setKadiAmount] = useState<number | ''>('');

    // Lokhand State
    const [lokhand, setLokhand] = useState<number | ''>('');
    const [lokhandRate, setLokhandRate] = useState<number | ''>('');
    const [lokhandAmount, setLokhandAmount] = useState<number | ''>('');

    const [loading, setLoading] = useState(false);

    // Auto-calculate amounts
    useEffect(() => {
        if (kadi !== '' && kadiRate !== '') {
            setKadiAmount(Number(kadi) * Number(kadiRate));
        } else {
            // Optional: clear amount if inputs cleared? Or keep manual override?
            // Let's assume auto-calc for now, but user can override if we didn't disable it.
            // For now, let's just calc on change.
        }
    }, [kadi, kadiRate]);

    useEffect(() => {
        if (lokhand !== '' && lokhandRate !== '') {
            setLokhandAmount(Number(lokhand) * Number(lokhandRate));
        }
    }, [lokhand, lokhandRate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 300));

            const newEntry: SellEntry = {
                date: date.split('-').reverse().join('/'), // Format YYYY-MM-DD to DD/MM/YYYY
                kadi: kadi === '' ? null : Number(kadi),
                kadiRate: kadiRate === '' ? null : Number(kadiRate),
                kadiAmount: kadiAmount === '' ? null : Number(kadiAmount),
                lokhand: lokhand === '' ? null : Number(lokhand),
                lokhandRate: lokhandRate === '' ? null : Number(lokhandRate),
                lokhandAmount: lokhandAmount === '' ? null : Number(lokhandAmount),
                ok: false // Default to false? Reference didn't show this field input.
            };

            onSuccess(newEntry);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content medium-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">Casting Sell Add</h2>

                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-row full-width">
                        <div className="form-group full-width">
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="form-input"
                                required
                            />
                        </div>
                    </div>

                    {/* Kadi Row */}
                    <div className="form-row three-col">
                        <div className="form-group">
                            <label className="form-label">Kadi</label>
                            <input
                                type="number"
                                value={kadi}
                                onChange={(e) => setKadi(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="256kg"
                                className="form-input"
                                step="0.001"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rate</label>
                            <input
                                type="number"
                                value={kadiRate}
                                onChange={(e) => setKadiRate(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="60"
                                className="form-input"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Total Amount</label>
                            <input
                                type="number"
                                value={kadiAmount}
                                onChange={(e) => setKadiAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="₹ 37,060"
                                className="form-input bg-gray"
                                readOnly // Assuming auto-calc usually implies readOnly, but user can override if we remove this.
                            // Reference showed "₹ 37,060" placeholder, suggesting display.
                            />
                        </div>
                    </div>

                    {/* Lokhand Row */}
                    <div className="form-row three-col">
                        <div className="form-group">
                            <label className="form-label">Lokhand</label>
                            <input
                                type="number"
                                value={lokhand}
                                onChange={(e) => setLokhand(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="256kg"
                                className="form-input"
                                step="0.001"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Rate</label>
                            <input
                                type="number"
                                value={lokhandRate}
                                onChange={(e) => setLokhandRate(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="60"
                                className="form-input"
                                step="0.01"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Total Amount</label>
                            <input
                                type="number"
                                value={lokhandAmount}
                                onChange={(e) => setLokhandAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder="₹ 17,612"
                                className="form-input bg-gray"
                                readOnly
                            />
                        </div>
                    </div>

                    <div className="modal-actions centered">
                        <button type="submit" className="save-button wide" disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" className="cancel-button wide" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCastingSellModal;
