import React, { useState, useEffect } from 'react';
import type { Party, PurchaseParty, Floor } from '../types';
import Loading from '../components/Loading';
import AddPartyModal from '../components/AddPartyModal';
import AddPurchasePartyModal from '../components/AddPurchasePartyModal';
import PartyOrdersModal from '../components/PartyOrdersModal';
import PartyAccountPanel from '../components/PartyAccountPanel';
import ImportPartyModal from '../components/ImportPartyModal';
import './InventoryPage.css';
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import ViewIcon from '../assets/view.svg';

import { partyApi } from '../api/party';
import { purchasePartyApi } from '../api/purchaseParty';
import { getUserFloor } from '../lib/auth';
import { formatDate } from '../utils/format';

type TabType = 'sales' | 'purchase';

const PartyMasterPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('sales');

    // Sales Party state
    const [parties, setParties] = useState<Party[]>([]);
    const [salesLoading, setSalesLoading] = useState(true);
    const [isSalesModalOpen, setIsSalesModalOpen] = useState(false);
    const [salesSearchQuery, setSalesSearchQuery] = useState('');
    const [salesFloorFilter, setSalesFloorFilter] = useState<Floor | ''>('');
    const [salesDeletingId, setSalesDeletingId] = useState<number | null>(null);
    const [salesError, setSalesError] = useState<string | null>(null);
    const [editingParty, setEditingParty] = useState<Party | undefined>(undefined);
    const [viewingParty, setViewingParty] = useState<Party | null>(null);
    const [accountParty, setAccountParty] = useState<Party | null>(null);
    const [isImportSalesOpen, setIsImportSalesOpen] = useState(false);

    // Purchase Party state
    const [purchaseParties, setPurchaseParties] = useState<PurchaseParty[]>([]);
    const [purchaseLoading, setPurchaseLoading] = useState(true);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
    const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');
    const [purchaseFloorFilter, setPurchaseFloorFilter] = useState<Floor | ''>('');
    const [purchaseDeletingId, setPurchaseDeletingId] = useState<number | null>(null);
    const [purchaseError, setPurchaseError] = useState<string | null>(null);
    const [editingPurchaseParty, setEditingPurchaseParty] = useState<PurchaseParty | undefined>(undefined);
    const [isImportPurchaseOpen, setIsImportPurchaseOpen] = useState(false);

    useEffect(() => {
        fetchParties();
    }, [salesSearchQuery, salesFloorFilter]);

    useEffect(() => {
        fetchPurchaseParties();
    }, [purchaseSearchQuery, purchaseFloorFilter]);

    const fetchParties = async () => {
        try {
            setSalesLoading(true);
            setSalesError(null);
            const data = await partyApi.getAllParties(
                salesSearchQuery.trim() || undefined,
                salesFloorFilter || undefined,
            );
            setParties(data);
        } catch (err: any) {
            console.error('Error fetching sales parties:', err);
            setSalesError('Failed to load parties. Please try again.');
        } finally {
            setSalesLoading(false);
        }
    };

    const fetchPurchaseParties = async () => {
        try {
            setPurchaseLoading(true);
            setPurchaseError(null);
            const data = await purchasePartyApi.getAll(
                purchaseSearchQuery.trim() || undefined,
                purchaseFloorFilter || undefined,
            );
            setPurchaseParties(data);
        } catch (err: any) {
            console.error('Error fetching purchase parties:', err);
            setPurchaseError('Failed to load purchase parties. Please try again.');
        } finally {
            setPurchaseLoading(false);
        }
    };

    const handleSalesDelete = async (partyId: number) => {
        if (!window.confirm('Are you sure you want to delete this party?')) return;
        setSalesDeletingId(partyId);
        try {
            await partyApi.deleteParty(partyId);
            setParties(parties.filter(p => p.partyId !== partyId));
        } catch (err: any) {
            console.error('Error deleting party:', err);
            alert('Failed to delete party. Please try again.');
        } finally {
            setSalesDeletingId(null);
        }
    };

    const handlePurchaseDelete = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this purchase party?')) return;
        setPurchaseDeletingId(id);
        try {
            await purchasePartyApi.delete(id);
            setPurchaseParties(purchaseParties.filter(p => p.id !== id));
        } catch (err: any) {
            console.error('Error deleting purchase party:', err);
            alert('Failed to delete purchase party. Please try again.');
        } finally {
            setPurchaseDeletingId(null);
        }
    };

    const handleSalesSuccess = async () => {
        await fetchParties();
        setIsSalesModalOpen(false);
        setEditingParty(undefined);
    };

    const handlePurchaseSuccess = async () => {
        await fetchPurchaseParties();
        setIsPurchaseModalOpen(false);
        setEditingPurchaseParty(undefined);
    };

    const filteredParties = parties.filter((party) =>
        party.name.toLowerCase().includes(salesSearchQuery.toLowerCase())
    );

    const filteredPurchaseParties = purchaseParties.filter((party) =>
        party.name.toLowerCase().includes(purchaseSearchQuery.toLowerCase())
    );

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Party Management</h1>
                    <p className="page-subtitle">Manage your parties</p>
                </div>

                <div className="header-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {activeTab === 'sales' ? (
                        <>
                            <button
                                type="button"
                                className="action-button secondary-button"
                                onClick={() => setIsImportSalesOpen(true)}
                                style={{ background: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7' }}
                            >
                                <span className="button-icon">📥</span>
                                <span className="button-text">Import from Excel</span>
                            </button>
                            <button
                                type="button"
                                className="action-button primary-button"
                                onClick={() => { setEditingParty(undefined); setIsSalesModalOpen(true); }}
                            >
                                <span className="button-icon">+</span>
                                <span className="button-text">Add Sales Party</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                className="action-button secondary-button"
                                onClick={() => setIsImportPurchaseOpen(true)}
                                style={{ background: '#E8F5E9', color: '#1B5E20', border: '1px solid #A5D6A7' }}
                            >
                                <span className="button-icon">📥</span>
                                <span className="button-text">Import from Excel</span>
                            </button>
                            <button
                                type="button"
                                className="action-button primary-button"
                                onClick={() => { setEditingPurchaseParty(undefined); setIsPurchaseModalOpen(true); }}
                            >
                                <span className="button-icon">+</span>
                                <span className="button-text">Add Purchase Party</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="page-tabs">
                <button
                    type="button"
                    className={`page-tab${activeTab === 'sales' ? ' active' : ''}`}
                    onClick={() => setActiveTab('sales')}
                >
                    Sales Party
                </button>
                <button
                    type="button"
                    className={`page-tab${activeTab === 'purchase' ? ' active' : ''}`}
                    onClick={() => setActiveTab('purchase')}
                >
                    Purchase Party
                </button>
            </div>

            {/* Sales Party Tab */}
            {activeTab === 'sales' && (
                <>
                    {salesError && (
                        <div className="tab-error">{salesError}</div>
                    )}

                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-label">Total Parties</span>
                            <span className="stat-value">{parties.length} Parties</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Filtered Results</span>
                            <span className="stat-value">{filteredParties.length} Parties</span>
                        </div>
                    </div>

                    <div className="order-filters">
                        <div className="order-search">
                            <img src={SearchIcon} alt="Search" />
                            <input
                                type="text"
                                placeholder="Search by party name"
                                value={salesSearchQuery}
                                onChange={(e) => setSalesSearchQuery(e.target.value)}
                            />
                        </div>
                        {getUserFloor() === null && <div className="filter-chips">
                            <button
                                type="button"
                                className={`filter-chip${salesFloorFilter === '' ? ' active' : ''}`}
                                onClick={() => setSalesFloorFilter('')}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                className={`filter-chip${salesFloorFilter === 'GROUND_FLOOR' ? ' active' : ''}`}
                                onClick={() => setSalesFloorFilter('GROUND_FLOOR')}
                            >
                                Ground Floor
                            </button>
                            <button
                                type="button"
                                className={`filter-chip${salesFloorFilter === 'FIRST_FLOOR' ? ' active' : ''}`}
                                onClick={() => setSalesFloorFilter('FIRST_FLOOR')}
                            >
                                First Floor
                            </button>
                        </div>}
                    </div>

                    {salesLoading ? (
                        <Loading message="Loading parties..." />
                    ) : (
                        <div className="inventory-table-container">
                            <table className="inventory-table">
                                <thead>
                                    <tr>
                                        <th>Sr. No</th>
                                        <th>Party ID</th>
                                        <th>Party Name</th>
                                        <th>Floor</th>
                                        <th title="Opening balance and orders, less payments received">Official Due</th>
                                        <th title="Opening balance and orders, less payments received">Offline Due</th>
                                        <th>Last Payment</th>
                                        <th>WhatsApp No.</th>
                                        <th>City</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredParties.map((party, index) => (
                                        <tr key={party.partyId}>
                                            <td>{String(index + 1).padStart(2, '0')}</td>
                                            <td>{party.partyId}</td>
                                            <td>{party.name}</td>
                                            <td>{party.floor === 'GROUND_FLOOR' ? 'Ground Floor' : party.floor === 'FIRST_FLOOR' ? 'First Floor' : '—'}</td>
                                            <td>
                                                <button type="button" className="party-due-link" onClick={() => setAccountParty(party)} title={`${paidTitle(party.officialAmount, party.officialReceived)}. Click for payment history.`}>
                                                    ₹{dueAfterPayments(party.officialAmount, party.officialReceived).toLocaleString('en-IN')}
                                                </button>
                                            </td>
                                            <td>
                                                <button type="button" className="party-due-link" onClick={() => setAccountParty(party)} title={`${paidTitle(party.offlineAmount, party.offlineReceived)}. Click for payment history.`}>
                                                    ₹{dueAfterPayments(party.offlineAmount, party.offlineReceived).toLocaleString('en-IN')}
                                                </button>
                                            </td>
                                            <td>{formatDate(party.lastPaymentDate)}</td>
                                            <td>{party.whatsappNo || '—'}</td>
                                            <td>{party.city || '—'}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        type="button"
                                                        className="party-payments-button"
                                                        onClick={() => setAccountParty(party)}
                                                        title="Payments, balance and statement"
                                                    >
                                                        Payments
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="icon-button"
                                                        onClick={() => setViewingParty(party)}
                                                        title="View Orders"
                                                    >
                                                        <img src={ViewIcon} alt="View" className="icon-img" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="icon-button"
                                                        onClick={() => { setEditingParty(party); setIsSalesModalOpen(true); }}
                                                        title="Edit"
                                                    >
                                                        <img src={EditIcon} alt="Edit" className="icon-img" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="icon-button"
                                                        onClick={() => handleSalesDelete(party.partyId)}
                                                        disabled={salesDeletingId === party.partyId}
                                                        title="Delete"
                                                    >
                                                        {salesDeletingId === party.partyId ? (
                                                            <span className="loading-spinner"></span>
                                                        ) : (
                                                            <img src={DeleteIcon} alt="Delete" className="icon-img" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredParties.length === 0 && (
                                        <tr>
                                            <td colSpan={10} className="no-data">
                                                No parties found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Purchase Party Tab */}
            {activeTab === 'purchase' && (
                <>
                    {purchaseError && (
                        <div className="tab-error">{purchaseError}</div>
                    )}

                    <div className="stats-grid">
                        <div className="stat-card">
                            <span className="stat-label">Total Purchase Parties</span>
                            <span className="stat-value">{purchaseParties.length} Parties</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Filtered Results</span>
                            <span className="stat-value">{filteredPurchaseParties.length} Parties</span>
                        </div>
                    </div>

                    <div className="order-filters">
                        <div className="order-search">
                            <img src={SearchIcon} alt="Search" />
                            <input
                                type="text"
                                placeholder="Search by party name"
                                value={purchaseSearchQuery}
                                onChange={(e) => setPurchaseSearchQuery(e.target.value)}
                            />
                        </div>
                        {getUserFloor() === null && <div className="filter-chips">
                            <button
                                type="button"
                                className={`filter-chip${purchaseFloorFilter === '' ? ' active' : ''}`}
                                onClick={() => setPurchaseFloorFilter('')}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                className={`filter-chip${purchaseFloorFilter === 'GROUND_FLOOR' ? ' active' : ''}`}
                                onClick={() => setPurchaseFloorFilter('GROUND_FLOOR')}
                            >
                                Ground Floor
                            </button>
                            <button
                                type="button"
                                className={`filter-chip${purchaseFloorFilter === 'FIRST_FLOOR' ? ' active' : ''}`}
                                onClick={() => setPurchaseFloorFilter('FIRST_FLOOR')}
                            >
                                First Floor
                            </button>
                        </div>}
                    </div>

                    {purchaseLoading ? (
                        <Loading message="Loading purchase parties..." />
                    ) : (
                        <div className="inventory-table-container">
                            <table className="inventory-table">
                                <thead>
                                    <tr>
                                        <th>Sr. No</th>
                                        <th>Party ID</th>
                                        <th>Party Name</th>
                                        <th>Floor</th>
                                        <th>Official Amount</th>
                                        <th>Offline Amount</th>
                                        <th>WhatsApp No.</th>
                                        <th>City</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPurchaseParties.map((party, index) => (
                                        <tr key={party.id}>
                                            <td>{String(index + 1).padStart(2, '0')}</td>
                                            <td>{party.id}</td>
                                            <td>{party.name}</td>
                                            <td>{party.floor === 'GROUND_FLOOR' ? 'Ground Floor' : party.floor === 'FIRST_FLOOR' ? 'First Floor' : '—'}</td>
                                            <td>₹{(party.officialAmount ?? 0).toLocaleString('en-IN')}</td>
                                            <td>₹{(party.offlineAmount ?? 0).toLocaleString('en-IN')}</td>
                                            <td>{party.whatsappNo || '—'}</td>
                                            <td>{party.city || '—'}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button
                                                        type="button"
                                                        className="icon-button"
                                                        onClick={() => { setEditingPurchaseParty(party); setIsPurchaseModalOpen(true); }}
                                                        title="Edit"
                                                    >
                                                        <img src={EditIcon} alt="Edit" className="icon-img" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="icon-button"
                                                        onClick={() => handlePurchaseDelete(party.id)}
                                                        disabled={purchaseDeletingId === party.id}
                                                        title="Delete"
                                                    >
                                                        {purchaseDeletingId === party.id ? (
                                                            <span className="loading-spinner"></span>
                                                        ) : (
                                                            <img src={DeleteIcon} alt="Delete" className="icon-img" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredPurchaseParties.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="no-data">
                                                No purchase parties found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {isSalesModalOpen && (
                <AddPartyModal
                    onClose={() => { setIsSalesModalOpen(false); setEditingParty(undefined); }}
                    onSuccess={handleSalesSuccess}
                    initialData={editingParty}
                />
            )}

            {isPurchaseModalOpen && (
                <AddPurchasePartyModal
                    onClose={() => { setIsPurchaseModalOpen(false); setEditingPurchaseParty(undefined); }}
                    onSuccess={handlePurchaseSuccess}
                    initialData={editingPurchaseParty}
                />
            )}

            {viewingParty && (
                <PartyOrdersModal
                    partyName={viewingParty.name}
                    onClose={() => setViewingParty(null)}
                />
            )}

            {accountParty && (
                <PartyAccountPanel
                    partyId={accountParty.partyId}
                    partyName={accountParty.name}
                    onClose={() => setAccountParty(null)}
                    onChanged={fetchParties}
                />
            )}

            {isImportSalesOpen && (
                <ImportPartyModal
                    partyType="sales"
                    existingParties={parties}
                    onClose={() => setIsImportSalesOpen(false)}
                    onSuccess={async () => { await fetchParties(); }}
                />
            )}

            {isImportPurchaseOpen && (
                <ImportPartyModal
                    partyType="purchase"
                    existingParties={purchaseParties}
                    onClose={() => setIsImportPurchaseOpen(false)}
                    onSuccess={async () => { await fetchPurchaseParties(); }}
                />
            )}
        </div>
    );
};

// The stored amount includes every order; payments received on those orders are taken off here
const dueAfterPayments = (amount: number, received?: number) =>
    Math.round(((amount || 0) - (received || 0)) * 100) / 100;

const paidTitle = (amount: number, received?: number) =>
    `Opening balance and orders ₹${(amount || 0).toLocaleString('en-IN')}, received ₹${(received || 0).toLocaleString('en-IN')}`;

export default PartyMasterPage;
