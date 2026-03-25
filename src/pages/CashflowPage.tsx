import React, { useState, useEffect, useCallback } from 'react';
import './CashflowPage.css';
import {
    cashflowSummaryApi,
    cashflowIncomeApi,
    cashflowExpenseApi,
    cashflowPartyApi,
    cashflowPaymentTypeApi,
} from '../api/cashflow';
import type {
    CashflowEntry,
    CashflowDailySummary,
    CashflowParty,
    CashflowPaymentType,
} from '../types';
import Loading from '../components/Loading';

const todayStr = () => new Date().toISOString().split('T')[0];

const formatCurrency = (n: number) =>
    `\u20B9 ${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type EntryType = 'income' | 'expense';

const CashflowPage: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(todayStr());
    const [summary, setSummary] = useState<CashflowDailySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Parties & payment types
    const [parties, setParties] = useState<CashflowParty[]>([]);
    const [paymentTypes, setPaymentTypes] = useState<CashflowPaymentType[]>([]);

    // Add form state
    const [showAddIncome, setShowAddIncome] = useState(false);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [addAmount, setAddAmount] = useState<number | ''>('');
    const [addPartyId, setAddPartyId] = useState<number | ''>('');
    const [addPaymentTypeId, setAddPaymentTypeId] = useState<number | ''>('');
    const [addNote, setAddNote] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    // Edit state
    const [editingEntry, setEditingEntry] = useState<{ id: number; type: EntryType } | null>(null);
    const [editAmount, setEditAmount] = useState<number | ''>('');
    const [editPartyId, setEditPartyId] = useState<number | ''>('');
    const [editPaymentTypeId, setEditPaymentTypeId] = useState<number | ''>('');
    const [editNote, setEditNote] = useState('');

    // New party / payment type inline
    const [showAddParty, setShowAddParty] = useState(false);
    const [newPartyName, setNewPartyName] = useState('');
    const [showAddPaymentType, setShowAddPaymentType] = useState(false);
    const [newPaymentTypeName, setNewPaymentTypeName] = useState('');

    // Close day
    const [closing, setClosing] = useState(false);

    const dayClosed = summary?.dayClosed ?? false;
    const isToday = selectedDate === todayStr();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await cashflowSummaryApi.get(selectedDate);
            setSummary(data);
        } catch (err: any) {
            console.error('Failed to fetch cashflow summary:', err);
            setError('Failed to load cashflow data.');
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        cashflowPartyApi.getAll().then(setParties).catch(() => {});
        cashflowPaymentTypeApi.getAll().then(setPaymentTypes).catch(() => {});
    }, []);

    const resetAddForm = () => {
        setAddAmount('');
        setAddPartyId('');
        setAddPaymentTypeId('');
        setAddNote('');
        setShowAddIncome(false);
        setShowAddExpense(false);
    };

    const handleAdd = async (type: EntryType) => {
        if (addAmount === '' || Number(addAmount) <= 0) return;
        try {
            setAddLoading(true);
            const api = type === 'income' ? cashflowIncomeApi : cashflowExpenseApi;
            await api.create({
                date: selectedDate,
                amount: Number(addAmount),
                ...(addPartyId ? { partyId: Number(addPartyId) } : {}),
                ...(addPaymentTypeId ? { paymentTypeId: Number(addPaymentTypeId) } : {}),
                ...(addNote.trim() ? { note: addNote.trim() } : {}),
            });
            resetAddForm();
            await fetchData();
        } catch (err) {
            console.error(`Failed to add ${type}:`, err);
            setError(`Failed to add ${type} entry.`);
        } finally {
            setAddLoading(false);
        }
    };

    const handleDelete = async (id: number, type: EntryType) => {
        if (!window.confirm('Delete this entry?')) return;
        try {
            const api = type === 'income' ? cashflowIncomeApi : cashflowExpenseApi;
            await api.delete(id);
            await fetchData();
        } catch (err) {
            console.error('Failed to delete:', err);
            setError('Failed to delete entry.');
        }
    };

    const startEdit = (entry: CashflowEntry, type: EntryType) => {
        setEditingEntry({ id: entry.id, type });
        setEditAmount(entry.amount);
        setEditPartyId(entry.party?.id ?? '');
        setEditPaymentTypeId(entry.paymentType?.id ?? '');
        setEditNote(entry.note ?? '');
    };

    const cancelEdit = () => {
        setEditingEntry(null);
        setEditAmount('');
        setEditPartyId('');
        setEditPaymentTypeId('');
        setEditNote('');
    };

    const handleUpdate = async () => {
        if (!editingEntry || editAmount === '' || Number(editAmount) <= 0) return;
        try {
            setAddLoading(true);
            const api = editingEntry.type === 'income' ? cashflowIncomeApi : cashflowExpenseApi;
            await api.update(editingEntry.id, {
                date: selectedDate,
                amount: Number(editAmount),
                ...(editPartyId ? { partyId: Number(editPartyId) } : {}),
                ...(editPaymentTypeId ? { paymentTypeId: Number(editPaymentTypeId) } : {}),
                ...(editNote.trim() ? { note: editNote.trim() } : {}),
            });
            cancelEdit();
            await fetchData();
        } catch (err) {
            console.error('Failed to update:', err);
            setError('Failed to update entry.');
        } finally {
            setAddLoading(false);
        }
    };

    const handleCloseDay = async () => {
        if (!window.confirm(`Close day for ${selectedDate}? The balance will carry forward to next day.`)) return;
        try {
            setClosing(true);
            await cashflowSummaryApi.closeDay(selectedDate);
            await fetchData();
        } catch (err: any) {
            console.error('Failed to close day:', err);
            setError('Failed to close day. It may already be closed.');
        } finally {
            setClosing(false);
        }
    };

    const handleAddParty = async () => {
        if (!newPartyName.trim()) return;
        try {
            const p = await cashflowPartyApi.create(newPartyName.trim());
            setParties(prev => [...prev, p]);
            setAddPartyId(p.id);
            setNewPartyName('');
            setShowAddParty(false);
        } catch (err) {
            console.error('Failed to add party:', err);
        }
    };

    const handleAddPaymentType = async () => {
        if (!newPaymentTypeName.trim()) return;
        try {
            const pt = await cashflowPaymentTypeApi.create(newPaymentTypeName.trim());
            setPaymentTypes(prev => [...prev, pt]);
            setAddPaymentTypeId(pt.id);
            setNewPaymentTypeName('');
            setShowAddPaymentType(false);
        } catch (err) {
            console.error('Failed to add payment type:', err);
        }
    };

    const renderEntryRow = (entry: CashflowEntry, type: EntryType) => {
        const isEditing = editingEntry?.id === entry.id && editingEntry?.type === type;
        const isCarryForward = entry.carryForward;

        if (isEditing) {
            return (
                <tr key={entry.id}>
                    <td>
                        <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value === '' ? '' : Number(e.target.value))} style={{ width: '80px', padding: '4px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} step="0.01" min="0" autoFocus />
                    </td>
                    <td>
                        <select value={editPartyId} onChange={e => setEditPartyId(e.target.value === '' ? '' : Number(e.target.value))} style={{ fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}>
                            <option value="">--</option>
                            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </td>
                    <td>
                        <select value={editPaymentTypeId} onChange={e => setEditPaymentTypeId(e.target.value === '' ? '' : Number(e.target.value))} style={{ fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #ccc' }}>
                            <option value="">--</option>
                            {paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                        </select>
                    </td>
                    <td>
                        <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} style={{ width: '100%', padding: '4px 6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ccc' }} />
                    </td>
                    <td>
                        <div className="entry-actions">
                            <button type="button" className="edit-btn" onClick={handleUpdate} disabled={addLoading} title="Save">&#10003;</button>
                            <button type="button" className="delete-btn" onClick={cancelEdit} title="Cancel">&#10005;</button>
                        </div>
                    </td>
                </tr>
            );
        }

        return (
            <tr key={entry.id} className={isCarryForward ? 'carry-forward-row' : ''}>
                <td>{formatCurrency(entry.amount)}</td>
                <td>{entry.party?.name || '-'}</td>
                <td>{entry.paymentType?.name || '-'}</td>
                <td>{entry.note || (isCarryForward ? 'Carry Forward' : '-')}</td>
                <td>
                    {!dayClosed && !isCarryForward && (
                        <div className="entry-actions">
                            <button type="button" className="edit-btn" onClick={() => startEdit(entry, type)} title="Edit">&#9998;</button>
                            <button type="button" className="delete-btn" onClick={() => handleDelete(entry.id, type)} title="Delete">&#10005;</button>
                        </div>
                    )}
                </td>
            </tr>
        );
    };

    const renderAddRow = (type: EntryType) => {
        const isShowing = type === 'income' ? showAddIncome : showAddExpense;
        if (!isShowing || dayClosed) return null;

        return (
            <div className="cashflow-add-row">
                <div className="form-mini-group">
                    <span className="form-mini-label">Amount*</span>
                    <input type="number" value={addAmount} onChange={e => setAddAmount(e.target.value === '' ? '' : Number(e.target.value))} placeholder="0.00" step="0.01" min="0" autoFocus />
                </div>
                <div className="form-mini-group">
                    <span className="form-mini-label">
                        Party
                        {!showAddParty && <button type="button" onClick={() => setShowAddParty(true)} style={{ border: 'none', background: 'none', color: '#5b9bd5', cursor: 'pointer', fontSize: '13px', marginLeft: '4px' }}>+</button>}
                    </span>
                    {showAddParty ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="text" value={newPartyName} onChange={e => setNewPartyName(e.target.value)} placeholder="Party name" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddParty())} style={{ flex: 1 }} />
                            <button type="button" className="add-confirm-btn" onClick={handleAddParty} disabled={!newPartyName.trim()} style={{ padding: '4px 8px', fontSize: '11px' }}>Add</button>
                            <button type="button" className="add-cancel-btn" onClick={() => { setShowAddParty(false); setNewPartyName(''); }}>&times;</button>
                        </div>
                    ) : (
                        <select value={addPartyId} onChange={e => setAddPartyId(e.target.value === '' ? '' : Number(e.target.value))}>
                            <option value="">--</option>
                            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                </div>
                <div className="form-mini-group">
                    <span className="form-mini-label">
                        Payment Type
                        {!showAddPaymentType && <button type="button" onClick={() => setShowAddPaymentType(true)} style={{ border: 'none', background: 'none', color: '#5b9bd5', cursor: 'pointer', fontSize: '13px', marginLeft: '4px' }}>+</button>}
                    </span>
                    {showAddPaymentType ? (
                        <div style={{ display: 'flex', gap: '4px' }}>
                            <input type="text" value={newPaymentTypeName} onChange={e => setNewPaymentTypeName(e.target.value)} placeholder="Type name" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddPaymentType())} style={{ flex: 1 }} />
                            <button type="button" className="add-confirm-btn" onClick={handleAddPaymentType} disabled={!newPaymentTypeName.trim()} style={{ padding: '4px 8px', fontSize: '11px' }}>Add</button>
                            <button type="button" className="add-cancel-btn" onClick={() => { setShowAddPaymentType(false); setNewPaymentTypeName(''); }}>&times;</button>
                        </div>
                    ) : (
                        <select value={addPaymentTypeId} onChange={e => setAddPaymentTypeId(e.target.value === '' ? '' : Number(e.target.value))}>
                            <option value="">--</option>
                            {paymentTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                        </select>
                    )}
                </div>
                <div className="form-mini-group">
                    <span className="form-mini-label">Note</span>
                    <input type="text" value={addNote} onChange={e => setAddNote(e.target.value)} placeholder="Optional note" onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAdd(type))} />
                </div>
                <button type="button" className="add-confirm-btn" onClick={() => handleAdd(type)} disabled={addLoading || addAmount === '' || Number(addAmount) <= 0}>
                    {addLoading ? '...' : 'Save'}
                </button>
                <button type="button" className="add-cancel-btn" onClick={resetAddForm}>&times;</button>
            </div>
        );
    };

    if (loading) {
        return <Loading message="Loading cashflow data..." />;
    }

    const incomes = summary?.incomes || [];
    const expenses = summary?.expenses || [];

    return (
        <div className="cashflow-page">
            {/* Header */}
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">
                        Cashflow
                        <span className="cashflow-kb-hint">Ctrl+J</span>
                    </h1>
                    <p className="page-subtitle">Daily income & expense tracker with carry-forward</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {!dayClosed && (
                        <button type="button" className="cashflow-close-day-btn" onClick={handleCloseDay} disabled={closing}>
                            {closing ? 'Closing...' : 'Close Day'}
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div style={{ padding: '10px 14px', backgroundColor: '#fee', color: '#c33', borderRadius: '6px', marginBottom: '16px', fontFamily: "'Jost', sans-serif", fontSize: '13px' }}>
                    {error}
                    <button type="button" onClick={() => setError(null)} style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', color: '#c33', fontWeight: 700 }}>&times;</button>
                </div>
            )}

            {/* Date selector */}
            <div className="cashflow-date-row">
                <input
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    max={todayStr()}
                />
                <span className={`cashflow-day-badge ${dayClosed ? 'closed' : ''}`}>
                    {dayClosed ? 'Day Closed' : (isToday ? 'Today - Open' : 'Open')}
                </span>
                {summary?.carryForwardAmount != null && summary.carryForwardAmount > 0 && (
                    <span style={{ fontFamily: "'Jost', sans-serif", fontSize: '13px', color: '#5b7a95' }}>
                        Carry Forward: {formatCurrency(summary.carryForwardAmount)} ({summary.carryForwardType})
                    </span>
                )}
            </div>

            {/* Summary cards */}
            <div className="cashflow-summary-grid">
                <div className="cashflow-summary-card">
                    <span className="stat-title">Total Income</span>
                    <span className="stat-value income">{formatCurrency(summary?.totalIncome ?? 0)}</span>
                </div>
                <div className="cashflow-summary-card">
                    <span className="stat-title">Total Expense</span>
                    <span className="stat-value expense">{formatCurrency(summary?.totalExpense ?? 0)}</span>
                </div>
                <div className="cashflow-summary-card">
                    <span className="stat-title">Net Balance</span>
                    <span className={`stat-value ${(summary?.netBalance ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                        {(summary?.netBalance ?? 0) < 0 ? '- ' : ''}{formatCurrency(summary?.netBalance ?? 0)}
                    </span>
                </div>
                <div className="cashflow-summary-card">
                    <span className="stat-title">Carry Forward</span>
                    <span className="stat-value">
                        {summary?.carryForwardAmount ? formatCurrency(summary.carryForwardAmount) : '-'}
                    </span>
                </div>
            </div>

            {/* Income & Expense columns */}
            <div className="cashflow-columns">
                {/* Income */}
                <div className="cashflow-column">
                    <div className="cashflow-column-header">
                        <span className="cashflow-column-title income">Income ({incomes.length})</span>
                        <button
                            type="button"
                            className="cashflow-add-btn"
                            onClick={() => { resetAddForm(); setShowAddIncome(true); }}
                            disabled={dayClosed}
                            title="Add income"
                        >+</button>
                    </div>
                    <table className="cashflow-table">
                        <thead>
                            <tr>
                                <th>Amount</th>
                                <th>Party</th>
                                <th>Payment</th>
                                <th>Note</th>
                                <th style={{ width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {incomes.length > 0 ? (
                                incomes.map(e => renderEntryRow(e, 'income'))
                            ) : (
                                <tr><td className="no-data" colSpan={5}>No income entries</td></tr>
                            )}
                        </tbody>
                    </table>
                    {renderAddRow('income')}
                </div>

                {/* Expense */}
                <div className="cashflow-column">
                    <div className="cashflow-column-header">
                        <span className="cashflow-column-title expense">Expense ({expenses.length})</span>
                        <button
                            type="button"
                            className="cashflow-add-btn"
                            onClick={() => { resetAddForm(); setShowAddExpense(true); }}
                            disabled={dayClosed}
                            title="Add expense"
                        >+</button>
                    </div>
                    <table className="cashflow-table">
                        <thead>
                            <tr>
                                <th>Amount</th>
                                <th>Party</th>
                                <th>Payment</th>
                                <th>Note</th>
                                <th style={{ width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.length > 0 ? (
                                expenses.map(e => renderEntryRow(e, 'expense'))
                            ) : (
                                <tr><td className="no-data" colSpan={5}>No expense entries</td></tr>
                            )}
                        </tbody>
                    </table>
                    {renderAddRow('expense')}
                </div>
            </div>
        </div>
    );
};

export default CashflowPage;
