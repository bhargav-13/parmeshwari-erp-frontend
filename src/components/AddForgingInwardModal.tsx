import React, { useState, useEffect, useRef } from 'react';
import './AddProductModal.css';
import type { ForgingInward, ForgingInwardItem, ForgingParty, InwardWeightUnit } from '../types';
import { forgingPartyApi, forgingInwardItemsApi } from '../api/forging';

const INWARD_WEIGHT_UNITS: { value: InwardWeightUnit; label: string }[] = [
    { value: 'KG', label: 'KG' },
    { value: 'CHHOL', label: 'Chhol' },
    { value: 'TAIYAR MAAL', label: 'Taiyar Maal' },
];

interface AddForgingInwardModalProps {
    onClose: () => void;
    onSubmit: (entry: Omit<ForgingInward, 'id'>) => Promise<void>;
    initialData?: ForgingInward | null;
}

const AddForgingInwardModal: React.FC<AddForgingInwardModalProps> = ({ onClose, onSubmit, initialData }) => {
    // Convert DD/MM/YYYY to YYYY-MM-DD for the date input
    const initDate = (() => {
        if (initialData?.date) {
            const parts = initialData.date.split('/');
            if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return new Date().toISOString().split('T')[0];
    })();

    // Form state
    const [date, setDate] = useState(initDate);
    const [partyId, setPartyId] = useState<number | ''>(initialData?.partyId ?? initialData?.party?.partyId ?? '');
    const [challanNo, setChallanNo] = useState(initialData?.challanNo ?? '');
    const [weight, setWeight] = useState<number | ''>(initialData?.weight ?? '');
    const [weightUnit, setWeightUnit] = useState<InwardWeightUnit>(initialData?.weightUnit ?? 'KG');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Parties state
    const [parties, setParties] = useState<ForgingParty[]>([]);
    const [partiesLoading, setPartiesLoading] = useState(true);

    // Add new party state
    const [showAddParty, setShowAddParty] = useState(false);
    const [newPartyName, setNewPartyName] = useState('');
    const [addingParty, setAddingParty] = useState(false);

    // Inward item state
    const [itemsOpen, setItemsOpen] = useState(false);
    const [item, setItem] = useState<ForgingInwardItem | null>(initialData?.item ?? null);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [addingItem, setAddingItem] = useState(false);
    const [showAddItemRow, setShowAddItemRow] = useState(false);
    const itemsContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchParties();
    }, []);

    // Set item open if editing and item exists
    useEffect(() => {
        if (initialData?.item) {
            setItem(initialData.item);
            setItemsOpen(true);
        }
    }, [initialData?.item]);

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
            const newParty = await forgingPartyApi.createParty(newPartyName.trim());

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

    const handleAddItem = async () => {
        if (!newItemName.trim()) return;
        if (!initialData?.id) {
            // For new entries, store locally (will be saved after inward is created)
            setItem({ name: newItemName.trim() });
            setNewItemName('');
            setShowAddItemRow(false);
            return;
        }

        try {
            setAddingItem(true);
            const created = await forgingInwardItemsApi.create(initialData.id, { name: newItemName.trim() });
            setItem(created);
            setNewItemName('');
            setShowAddItemRow(false);
        } catch (err) {
            console.error('Failed to add item:', err);
            setError('Failed to add item');
        } finally {
            setAddingItem(false);
        }
    };

    const handleDeleteItem = async () => {
        if (item?.id && initialData?.id) {
            try {
                await forgingInwardItemsApi.delete(initialData.id, item.id);
                setItem(null);
            } catch (err) {
                console.error('Failed to delete item:', err);
                setError('Failed to delete item');
            }
        } else {
            setItem(null);
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
            await onSubmit({
                partyId: Number(partyId),
                partyName: selectedParty?.partyName || '',
                challanNo,
                date: `${day}/${month}/${year}`,
                weight: Number(weight),
                weightUnit,
                item,
            });
        } catch (err: any) {
            console.error('Error saving entry:', err);
            setError('Failed to save entry');
        } finally {
            setLoading(false);
        }
    };

    // Calculate items content height for smooth animation
    const getItemsContentHeight = () => {
        if (itemsContentRef.current) {
            return itemsContentRef.current.scrollHeight;
        }
        return 0;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content small-modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
                <h2 className="modal-title">{initialData ? 'Edit Forging Inward Entry' : 'Add Forging Inward Entry'}</h2>

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

                    {/* Inward Items Section */}
                    <div style={{
                        marginBottom: '16px',
                        border: '1px solid #d0dde8',
                        borderRadius: '8px',
                        overflow: 'hidden',
                    }}>
                        {/* Header with toggle and add button */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: '#f4f8fb',
                                cursor: 'pointer',
                                userSelect: 'none',
                            }}
                            onClick={() => setItemsOpen(!itemsOpen)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg
                                    width="16" height="16" viewBox="0 0 24 24"
                                    fill="none" stroke="#5b9bd5" strokeWidth="2.5"
                                    strokeLinecap="round" strokeLinejoin="round"
                                    aria-hidden="true"
                                    style={{
                                        transform: itemsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.25s ease',
                                    }}
                                >
                                    <polyline points="9 18 15 12 9 6" />
                                </svg>
                                <span style={{
                                    fontFamily: "'Jost', sans-serif",
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#17344D',
                                }}>
                                    Inward Item {item ? '(1)' : ''}
                                </span>
                            </div>
                            <button
                                type="button"
                                title="Add item"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (!itemsOpen) setItemsOpen(true);
                                    setShowAddItemRow(true);
                                }}
                                style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    border: '1.5px solid #5b9bd5',
                                    background: '#fff',
                                    color: '#5b9bd5',
                                    fontSize: '18px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    lineHeight: 1,
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#5b9bd5';
                                    e.currentTarget.style.color = '#fff';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#fff';
                                    e.currentTarget.style.color = '#5b9bd5';
                                }}
                            >
                                +
                            </button>
                        </div>

                        {/* Collapsible content */}
                        <div
                            ref={itemsContentRef}
                            style={{
                                maxHeight: itemsOpen ? `${getItemsContentHeight() + 500}px` : '0px',
                                overflow: 'hidden',
                                transition: 'max-height 0.35s ease',
                            }}
                        >
                            <div style={{ padding: '12px 14px' }}>
                                {itemsLoading ? (
                                    <div style={{ textAlign: 'center', padding: '12px', color: '#8E8E8E', fontSize: '13px' }}>
                                        Loading items...
                                    </div>
                                ) : (
                                    <>
                                        {/* Current item */}
                                        {item ? (
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 8px',
                                                borderBottom: '1px solid #eef2f6',
                                                fontFamily: "'Jost', sans-serif",
                                                fontSize: '13px',
                                                color: '#17344D',
                                            }}>
                                                <span>{item.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={handleDeleteItem}
                                                    title="Remove item"
                                                    style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        cursor: 'pointer',
                                                        color: '#c33',
                                                        fontSize: '16px',
                                                        lineHeight: 1,
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                    }}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        ) : !showAddItemRow ? (
                                            <div style={{ textAlign: 'center', padding: '12px', color: '#8E8E8E', fontSize: '13px', fontFamily: "'Jost', sans-serif" }}>
                                                No item added yet. Click + to add.
                                            </div>
                                        ) : null}

                                        {/* Add item row */}
                                        {showAddItemRow && !item && (
                                            <div style={{
                                                display: 'flex',
                                                gap: '8px',
                                                alignItems: 'flex-end',
                                                padding: '4px 0',
                                            }}>
                                                <div style={{ flex: 1 }}>
                                                    <label style={{ fontSize: '12px', color: '#5b7a95', fontFamily: "'Jost', sans-serif", fontWeight: 500, marginBottom: '4px', display: 'block' }}>Item Name</label>
                                                    <input
                                                        type="text"
                                                        value={newItemName}
                                                        onChange={(e) => setNewItemName(e.target.value)}
                                                        placeholder="e.g. Ring, Bolt"
                                                        className="form-input"
                                                        style={{ fontSize: '13px', padding: '8px 10px' }}
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    className="add-confirm-btn"
                                                    onClick={handleAddItem}
                                                    disabled={addingItem || !newItemName.trim()}
                                                    style={{ marginBottom: '0', height: '36px', fontSize: '13px' }}
                                                >
                                                    {addingItem ? '...' : 'Add'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowAddItemRow(false);
                                                        setNewItemName('');
                                                    }}
                                                    style={{
                                                        border: 'none',
                                                        background: 'transparent',
                                                        cursor: 'pointer',
                                                        color: '#999',
                                                        fontSize: '18px',
                                                        padding: '4px 8px',
                                                        marginBottom: '0',
                                                        height: '36px',
                                                    }}
                                                    title="Cancel"
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
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
