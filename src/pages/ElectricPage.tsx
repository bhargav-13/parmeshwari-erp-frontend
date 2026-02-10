import React, { useState } from 'react';
import './InventoryPage.css'; // Reusing styles
import SearchIcon from '../assets/search.svg';

type ElectricTab = 'CREDIT' | 'OUTWARDS';

interface CreditEntry {
    id: number;
    date: string;
    challanNo: string;
    kg: number;
    unit: string;
    rate: number;
}

const MOCK_CREDIT_ENTRIES: CreditEntry[] = [
    { id: 1, date: '2023-10-25', challanNo: 'CH-1001', kg: 50, unit: 'Kg', rate: 120 },
    { id: 2, date: '2023-10-26', challanNo: 'CH-1002', kg: 30, unit: 'Kg', rate: 125 },
    { id: 3, date: '2023-10-27', challanNo: 'CH-1003', kg: 75, unit: 'Kg', rate: 118 },
];

import AddElectricCreditModal, { type ElectricCreditEntry } from '../components/AddElectricCreditModal';

const ElectricPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ElectricTab>('CREDIT');
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddCreditModalOpen, setIsAddCreditModalOpen] = useState(false);

    // Mock state for entries to demonstrate adding
    const [creditEntries, setCreditEntries] = useState<CreditEntry[]>(MOCK_CREDIT_ENTRIES);

    const handleTabChange = (tab: ElectricTab) => {
        setActiveTab(tab);
    };

    const handleAdd = () => {
        if (activeTab === 'CREDIT') {
            setIsAddCreditModalOpen(true);
        } else {
            console.log('Add Outward clicked');
            // Future outward modal logic
        }
    };

    const handleAddCreditSuccess = (entry: ElectricCreditEntry) => {
        const newId = Math.max(...creditEntries.map(e => e.id), 0) + 1;
        setCreditEntries([...creditEntries, { id: newId, ...entry }]);
    };

    const filteredEntries = creditEntries.filter(entry =>
        entry.challanNo.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Electric Management</h1>
                    <p className="page-subtitle">Manage electric entries for credit and outwards</p>
                </div>
                <div className="header-actions">
                    <button
                        type="button"
                        className="action-button primary-button"
                        onClick={handleAdd}
                    >
                        <span className="button-icon">+</span>
                        <span className="button-text">
                            {activeTab === 'CREDIT' ? 'Add Credit' : 'Add Outward'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Segmented Control Navigation - Casting Style */}
            <div style={{
                display: 'flex',
                width: '100%',
                backgroundColor: '#e9ecef',
                borderRadius: '8px',
                padding: '4px',
                marginBottom: '24px',
                border: 'none'
            }}>
                <button
                    onClick={() => handleTabChange('CREDIT')}
                    style={{
                        flex: 1,
                        cursor: 'pointer',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: activeTab === 'CREDIT' ? '#ffffff' : 'transparent',
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '16px',
                        fontWeight: activeTab === 'CREDIT' ? '600' : '500',
                        color: activeTab === 'CREDIT' ? '#0d6efd' : '#495057',
                        boxShadow: activeTab === 'CREDIT' ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none',
                        transition: 'all 0.2s ease',
                        height: 'auto',
                        minHeight: 'unset'
                    }}
                >
                    Credit
                </button>
                <div style={{ width: '0px' }}></div>
                <button
                    onClick={() => handleTabChange('OUTWARDS')}
                    style={{
                        flex: 1,
                        cursor: 'pointer',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: activeTab === 'OUTWARDS' ? '#ffffff' : 'transparent',
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '16px',
                        fontWeight: activeTab === 'OUTWARDS' ? '600' : '500',
                        color: activeTab === 'OUTWARDS' ? '#0d6efd' : '#495057',
                        boxShadow: activeTab === 'OUTWARDS' ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none',
                        transition: 'all 0.2s ease',
                        height: 'auto',
                        minHeight: 'unset'
                    }}
                >
                    Outwards
                </button>
            </div>

            {/* Content Area */}
            <div className="inventory-table-container" style={{ padding: '0', background: 'transparent', boxShadow: 'none', border: 'none' }}>
                {activeTab === 'CREDIT' && (
                    <>
                        <div className="order-filters" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                            <div className="order-search">
                                <img src={SearchIcon} alt="Search" />
                                <input
                                    type="text"
                                    placeholder="Search by Challan No."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="action-button secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="button-text">Download</span>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="inventory-table-container" style={{ border: 'none', boxShadow: 'none' }}>
                            <table className="inventory-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Challan No.</th>
                                        <th>KG</th>
                                        <th>Unit</th>
                                        <th>Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEntries.map((entry) => (
                                        <tr key={entry.id}>
                                            <td>{entry.date}</td>
                                            <td>{entry.challanNo}</td>
                                            <td>{entry.kg}</td>
                                            <td>{entry.unit}</td>
                                            <td>₹{entry.rate}</td>
                                        </tr>
                                    ))}
                                    {filteredEntries.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="no-data">No entries found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                {activeTab === 'OUTWARDS' && (
                    <div style={{ fontSize: '24px', textAlign: 'center', color: '#666', padding: '40px' }}>
                        Welcome
                    </div>
                )}
            </div>

            {isAddCreditModalOpen && (
                <AddElectricCreditModal
                    onClose={() => setIsAddCreditModalOpen(false)}
                    onSuccess={handleAddCreditSuccess}
                />
            )}
        </div>
    );
};

export default ElectricPage;
