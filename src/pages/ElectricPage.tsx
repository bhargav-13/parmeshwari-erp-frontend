import React, { useState } from 'react';
import './SubcontractingPage.css';
import './InventoryPage.css';
import SearchIcon from '../assets/search.svg';
import AddElectricCreditModal, { type ElectricCreditEntry } from '../components/AddElectricCreditModal';
import AddElectricOutwardModal, { type ElectricOutwardEntry } from '../components/AddElectricOutwardModal';

type ElectricTab = 'OUTWARDS' | 'CREDIT';

interface CreditEntryWithId extends ElectricCreditEntry {
    id: number;
}

interface OutwardEntryWithId extends ElectricOutwardEntry {
    id: number;
}

const MOCK_CREDIT_ENTRIES: CreditEntryWithId[] = [
    { id: 1, date: '01/01/2026', challanNo: 'CH-1001', kg: 50 },
    { id: 2, date: '01/01/2026', challanNo: 'CH-1002', kg: 30 },
    { id: 3, date: '01/01/2026', challanNo: 'CH-1003', kg: 75 },
];

const MOCK_OUTWARD_ENTRIES: OutwardEntryWithId[] = [
    { id: 1, date: '01/01/2026', challanNo: 'OUT-2001', unitKg: 50, unitPrice: 120, kgPrice: 6000 },
];

const ElectricPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ElectricTab>('OUTWARDS');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddCreditModalOpen, setIsAddCreditModalOpen] = useState(false);
    const [isAddOutwardModalOpen, setIsAddOutwardModalOpen] = useState(false);

    const [creditEntries, setCreditEntries] = useState<CreditEntryWithId[]>(MOCK_CREDIT_ENTRIES);
    const [outwardEntries, setOutwardEntries] = useState<OutwardEntryWithId[]>(MOCK_OUTWARD_ENTRIES);

    const handleTabChange = (tab: ElectricTab) => {
        setActiveTab(tab);
        setSearchQuery('');
    };

    const handleAdd = () => {
        if (activeTab === 'CREDIT') {
            setIsAddCreditModalOpen(true);
        } else {
            setIsAddOutwardModalOpen(true);
        }
    };

    const handleAddCreditSuccess = (entry: ElectricCreditEntry) => {
        const newId = Math.max(...creditEntries.map(e => e.id), 0) + 1;
        setCreditEntries([...creditEntries, { id: newId, ...entry }]);
    };

    const handleAddOutwardSuccess = (entry: ElectricOutwardEntry) => {
        const newId = Math.max(...outwardEntries.map(e => e.id), 0) + 1;
        setOutwardEntries([...outwardEntries, { id: newId, ...entry }]);
    };

    const filteredCreditEntries = creditEntries.filter(entry =>
        entry.challanNo.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredOutwardEntries = outwardEntries.filter(entry =>
        entry.challanNo.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Stats
    const stats = {
        totalOrders: 32,
        inProgress: 24,
        completed: 51,
        totalBilledAmount: 212456,
    };

    return (
        <div className="subcontracting-page">
            {/* Outwards / Credit Tab Toggle */}
            <div style={{
                display: 'flex',
                width: '100%',
                borderRadius: '10px',
                overflow: 'hidden',
                marginBottom: '24px',
                border: '1.5px solid #b4d5ef',
                background: '#fff',
            }}>
                <button
                    type="button"
                    onClick={() => handleTabChange('OUTWARDS')}
                    style={{
                        flex: 1,
                        padding: '14px 0',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Jost', sans-serif",
                        fontSize: '16px',
                        fontWeight: activeTab === 'OUTWARDS' ? 600 : 500,
                        color: activeTab === 'OUTWARDS' ? '#fff' : '#17344D',
                        backgroundColor: activeTab === 'OUTWARDS' ? '#5b9bd5' : '#fff',
                        transition: 'all 0.25s ease',
                        letterSpacing: '0.3px',
                    }}
                >
                    Outwards
                </button>
                <button
                    type="button"
                    onClick={() => handleTabChange('CREDIT')}
                    style={{
                        flex: 1,
                        padding: '14px 0',
                        border: 'none',
                        outline: 'none',
                        cursor: 'pointer',
                        fontFamily: "'Jost', sans-serif",
                        fontSize: '16px',
                        fontWeight: activeTab === 'CREDIT' ? 600 : 500,
                        color: activeTab === 'CREDIT' ? '#fff' : '#17344D',
                        backgroundColor: activeTab === 'CREDIT' ? '#5b9bd5' : '#fff',
                        transition: 'all 0.25s ease',
                        letterSpacing: '0.3px',
                    }}
                >
                    Credit
                </button>
            </div>

            {/* Page Header - Title + Add Entry */}
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Electric Management</h1>
                    <p className="page-subtitle">Track materials, processes, and billing for electric work.</p>
                </div>
                <button type="button" className="add-button" onClick={handleAdd}>
                    <span className="add-icon">+</span>
                    <span className="add-text">Add Entry</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Orders</span>
                        <span className="stat-value">{stats.totalOrders}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">In Progress</span>
                        <span className="stat-value">{stats.inProgress}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Completed</span>
                        <span className="stat-value">{stats.completed}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Billed Amount</span>
                        <span className="stat-value">₹ {stats.totalBilledAmount.toLocaleString('en-IN')}</span>
                    </div>
                </div>
            </div>

            {/* Search, Download, Filter Row */}
            <div className="order-filters">
                <div className="order-search" style={{ flex: 3 }}>
                    <img src={SearchIcon} alt="Search" />
                    <input
                        type="text"
                        placeholder="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            border: 'none',
                            background: 'transparent',
                            outline: 'none',
                            fontFamily: "'Jost', sans-serif",
                            fontSize: '14px',
                            color: '#17344d',
                            flex: 1,
                            width: '100%',
                        }}
                    />
                </div>
                <button
                    type="button"
                    className="action-button secondary-button"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <span className="button-text">Download</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
                <button
                    type="button"
                    className="action-button secondary-button"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    <span className="button-text">Filter</span>
                </button>
            </div>

            {/* Data Table */}
            <div className="inventory-table-container" style={{ border: '1px solid rgba(125,153,169,0.3)', borderRadius: '12px' }}>
                <table className="inventory-table" style={{ minWidth: '600px' }}>
                    <thead>
                        <tr>
                            {activeTab === 'OUTWARDS' ? (
                                <>
                                    <th style={{ textAlign: 'center' }}>Date</th>
                                    <th style={{ textAlign: 'center' }}>Challan No.</th>
                                    <th style={{ textAlign: 'center' }}>Unit Kg</th>
                                    <th style={{ textAlign: 'center' }}>Unit Price</th>
                                    <th style={{ textAlign: 'center' }}>Kg Price</th>
                                </>
                            ) : (
                                <>
                                    <th style={{ textAlign: 'center' }}>Date</th>
                                    <th style={{ textAlign: 'center' }}>Challan No.</th>
                                    <th style={{ textAlign: 'center' }}>Kg</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {activeTab === 'OUTWARDS' ? (
                            <>
                                {filteredOutwardEntries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td style={{ textAlign: 'center' }}>{entry.date}</td>
                                        <td style={{ textAlign: 'center' }}>{entry.challanNo}</td>
                                        <td style={{ textAlign: 'center' }}>{entry.unitKg}</td>
                                        <td style={{ textAlign: 'center' }}>{entry.unitPrice}</td>
                                        <td style={{ textAlign: 'center' }}>{entry.kgPrice}</td>
                                    </tr>
                                ))}
                                {filteredOutwardEntries.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="no-data">No entries found</td>
                                    </tr>
                                )}
                            </>
                        ) : (
                            <>
                                {filteredCreditEntries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td style={{ textAlign: 'center' }}>{entry.date}</td>
                                        <td style={{ textAlign: 'center' }}>{entry.challanNo}</td>
                                        <td style={{ textAlign: 'center' }}>{entry.kg}</td>
                                    </tr>
                                ))}
                                {filteredCreditEntries.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="no-data">No entries found</td>
                                    </tr>
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals */}
            {isAddCreditModalOpen && (
                <AddElectricCreditModal
                    onClose={() => setIsAddCreditModalOpen(false)}
                    onSuccess={handleAddCreditSuccess}
                />
            )}

            {isAddOutwardModalOpen && (
                <AddElectricOutwardModal
                    onClose={() => setIsAddOutwardModalOpen(false)}
                    onSuccess={handleAddOutwardSuccess}
                />
            )}
        </div>
    );
};

export default ElectricPage;
