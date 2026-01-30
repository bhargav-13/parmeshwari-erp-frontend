import React, { useState, useEffect } from 'react';
import type { KevinScrapRequest, JayeshScrapRequest, KevinScrapContractor, JayeshScrapContractor } from '../api/scrap';
import { kevinScrapApi, jayeshScrapApi } from '../api/scrap';
import './ScrapEntryModal.css';

interface ScrapEntryModalProps {
    onClose: () => void;
    onSubmit: (data: KevinScrapRequest | JayeshScrapRequest) => Promise<void>;
    scrapType: 'kevin' | 'jayesh';
    initialData?: KevinScrapRequest | JayeshScrapRequest;
}

const ScrapEntryModal: React.FC<ScrapEntryModalProps> = ({
    onClose,
    onSubmit,
    scrapType,
    initialData,
}) => {
    const [formData, setFormData] = useState<KevinScrapRequest | JayeshScrapRequest>(
        initialData || {
            scrapContractorId: 0,
            challanNo: '',
            orderDate: new Date().toISOString().split('T')[0],
            item: '',
            elementValue: 0,
            elementType: 'FOAM',
            totalWeight: 0,
            outWeight: 0,
            netWeight: 0,
            ...(scrapType === 'jayesh' && { rate: 0 }),
        }
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [contractors, setContractors] = useState<(KevinScrapContractor | JayeshScrapContractor)[]>([]);
    const [loadingContractors, setLoadingContractors] = useState(true);

    // States for adding new contractor inline
    const [showAddContractor, setShowAddContractor] = useState(false);
    const [newContractorName, setNewContractorName] = useState('');
    const [addingContractor, setAddingContractor] = useState(false);

    useEffect(() => {
        const fetchContractors = async () => {
            try {
                setLoadingContractors(true);
                const contractorList = scrapType === 'kevin'
                    ? await kevinScrapApi.getContractorList()
                    : await jayeshScrapApi.getContractorList();
                setContractors(contractorList);
            } catch (err) {
                console.error('Failed to fetch contractors:', err);
                setError('Failed to load contractors');
            } finally {
                setLoadingContractors(false);
            }
        };

        fetchContractors();
    }, [scrapType]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const numericFields = ['scrapContractorId', 'elementValue', 'totalWeight', 'outWeight', 'netWeight', 'rate'];
        setFormData((prev) => ({
            ...prev,
            [name]: numericFields.includes(name) ? parseFloat(value) || 0 : value,
        }));
    };

    const handleAddContractor = async () => {
        if (!newContractorName.trim()) return;

        try {
            setAddingContractor(true);
            const newContractor = scrapType === 'kevin'
                ? await kevinScrapApi.addContractor(newContractorName.trim())
                : await jayeshScrapApi.addContractor(newContractorName.trim());
            setContractors((prev) => [...prev, newContractor]);
            setFormData((prev) => ({ ...prev, scrapContractorId: newContractor.scrapContractorId }));
            setNewContractorName('');
            setShowAddContractor(false);
        } catch (err) {
            console.error('Failed to add contractor:', err);
            setError('Failed to add contractor');
        } finally {
            setAddingContractor(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.scrapContractorId) {
            setError('Contractor is required');
            return;
        }

        if (!formData.challanNo.trim()) {
            setError('Challan number is required');
            return;
        }

        try {
            setLoading(true);
            await onSubmit(formData);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to save scrap entry');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="scrap-modal-content" onClick={(e) => e.stopPropagation()}>
                <h2 className="scrap-modal-title">Scrap Entry</h2>

                <form onSubmit={handleSubmit} className="scrap-modal-form">
                    <div className="scrap-form-row">
                        <div className="scrap-form-group">
                            <label className="scrap-form-label" htmlFor="scrapContractorId">Contractor Name:</label>
                            <div className="dropdown-with-add">
                                <select
                                    id="scrapContractorId"
                                    name="scrapContractorId"
                                    value={formData.scrapContractorId}
                                    onChange={handleChange}
                                    className="scrap-form-input"
                                    required
                                    disabled={loadingContractors || showAddContractor}
                                >
                                    <option value={0}>Select Contractor</option>
                                    {contractors.map((contractor) => (
                                        <option key={contractor.scrapContractorId} value={contractor.scrapContractorId}>
                                            {contractor.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="add-new-btn"
                                    onClick={() => setShowAddContractor(!showAddContractor)}
                                    title="Add new contractor"
                                >
                                    {showAddContractor ? '×' : '+'}
                                </button>
                            </div>
                            {showAddContractor && (
                                <div className="add-new-input-group">
                                    <input
                                        type="text"
                                        value={newContractorName}
                                        onChange={(e) => setNewContractorName(e.target.value)}
                                        placeholder="Enter contractor name"
                                        className="scrap-form-input add-new-input"
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddContractor())}
                                    />
                                    <button
                                        type="button"
                                        className="add-confirm-btn"
                                        onClick={handleAddContractor}
                                        disabled={addingContractor || !newContractorName.trim()}
                                    >
                                        {addingContractor ? '...' : 'Add'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="scrap-form-group">
                            <label className="scrap-form-label">Challan No.</label>
                            <input
                                type="text"
                                name="challanNo"
                                value={formData.challanNo}
                                onChange={handleChange}
                                placeholder="25260007"
                                className="scrap-form-input"
                                required
                            />
                        </div>

                        <div className="scrap-form-group">
                            <label className="scrap-form-label">Order Date:</label>
                            <input
                                type="date"
                                name="orderDate"
                                value={formData.orderDate}
                                onChange={handleChange}
                                className="scrap-form-input"
                                required
                            />
                        </div>
                    </div>

                    <div className="scrap-form-row">
                        <div className="scrap-form-group">
                            <label className="scrap-form-label">Item</label>
                            <input
                                type="text"
                                name="item"
                                value={formData.item}
                                onChange={handleChange}
                                placeholder="Brass"
                                className="scrap-form-input"
                                required
                            />
                        </div>

                        <div className="scrap-form-group scrap-element-group">
                            <label className="scrap-form-label">Element</label>
                            <div className="element-inputs">
                                <input
                                    type="number"
                                    name="elementValue"
                                    value={formData.elementValue}
                                    onChange={handleChange}
                                    placeholder="12"
                                    className="scrap-form-input element-value"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                                <select
                                    name="elementType"
                                    value={formData.elementType}
                                    onChange={handleChange}
                                    className="scrap-form-select element-type"
                                >
                                    <option value="FOAM">Foam</option>
                                    <option value="BAG">Bag</option>
                                    <option value="PETI">Peti</option>
                                    <option value="DRUM">Drum</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="scrap-form-row">
                        <div className="scrap-form-group">
                            <label className="scrap-form-label">Total Weight</label>
                            <input
                                type="number"
                                name="totalWeight"
                                value={formData.totalWeight}
                                onChange={handleChange}
                                placeholder="1500kg"
                                className="scrap-form-input"
                                step="0.001"
                                min="0"
                                required
                            />
                        </div>

                        <div className="scrap-form-group">
                            <label className="scrap-form-label">Out Weight</label>
                            <input
                                type="number"
                                name="outWeight"
                                value={formData.outWeight}
                                onChange={handleChange}
                                placeholder="2.5kg"
                                className="scrap-form-input"
                                step="0.001"
                                min="0"
                                required
                            />
                        </div>

                        <div className="scrap-form-group">
                            <label className="scrap-form-label">Net Weight</label>
                            <input
                                type="number"
                                name="netWeight"
                                value={formData.netWeight}
                                onChange={handleChange}
                                placeholder="150kg"
                                className="scrap-form-input"
                                step="0.001"
                                min="0"
                                required
                            />
                        </div>
                    </div>

                    {scrapType === 'jayesh' && (
                        <div className="scrap-form-row">
                            <div className="scrap-form-group">
                                <label className="scrap-form-label">Rate</label>
                                <input
                                    type="number"
                                    name="rate"
                                    value={(formData as JayeshScrapRequest).rate || 0}
                                    onChange={handleChange}
                                    placeholder="Enter rate"
                                    className="scrap-form-input"
                                    step="0.01"
                                    min="0"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {error && <div className="error-message">{error}</div>}

                    <div className="scrap-modal-actions">
                        <button type="submit" className="scrap-save-button" disabled={loading}>
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                        <button type="button" className="scrap-cancel-button" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScrapEntryModal;
