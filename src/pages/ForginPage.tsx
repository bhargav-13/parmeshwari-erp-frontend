import React, { useState } from 'react';
import './InventoryPage.css'; // Reusing styles
import './CastingPage.css'; // Reusing card styles
import SearchIcon from '../assets/search.svg';
import AddForginInwardModal, { type ForginInwardEntry } from '../components/AddForginInwardModal';
import AddForginOutwardModal, { type ForginOutwardEntry } from '../components/AddForginOutwardModal';
import ForginDownloadOptionsModal from '../components/ForginDownloadOptionsModal'; // New Import
import ForginReportModal from '../components/ForginReportModal'; // New Import

type ForginTab = 'INWARD' | 'OUTWARD';

interface InwardEntryWithId extends ForginInwardEntry {
    id: number;
}

interface OutwardEntryWithId extends ForginOutwardEntry {
    id: number;
}

const MOCK_INWARD_ENTRIES: InwardEntryWithId[] = [
    { id: 1, date: '2023-11-01', partyName: 'Vendor A', challanNo: 'CH-5001', price: 120.5, weight: 100, unit: 'Kg' },
    { id: 2, date: '2023-11-02', partyName: 'Vendor B', challanNo: 'CH-5002', price: 85.0, weight: 50, unit: 'Pcs' },
];

const MOCK_OUTWARD_ENTRIES: OutwardEntryWithId[] = [
    { id: 1, date: '2023-11-03', partyName: 'Client X', challanNo: 'OUT-6001', price: 45.2, weight: 200, unit: 'Kg' },
];

const ForginPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ForginTab>('INWARD');
    const [searchQuery, setSearchQuery] = useState('');
    const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
    const [isOutwardModalOpen, setIsOutwardModalOpen] = useState(false);

    // Download Flow State
    const [isDownloadOptionsOpen, setIsDownloadOptionsOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [reportOptions, setReportOptions] = useState<{ party: string; start: string; end: string } | null>(null);

    const [inwardEntries, setInwardEntries] = useState<InwardEntryWithId[]>(MOCK_INWARD_ENTRIES);
    const [outwardEntries, setOutwardEntries] = useState<OutwardEntryWithId[]>(MOCK_OUTWARD_ENTRIES);

    const handleTabChange = (tab: ForginTab) => {
        setActiveTab(tab);
        setSearchQuery('');
    };

    const handleAdd = () => {
        if (activeTab === 'INWARD') {
            setIsInwardModalOpen(true);
        } else {
            setIsOutwardModalOpen(true);
        }
    };

    const handleAddInwardSuccess = (entry: ForginInwardEntry) => {
        const newId = Math.max(...inwardEntries.map(e => e.id), 0) + 1;
        setInwardEntries([...inwardEntries, { id: newId, ...entry }]);
    };

    const handleAddOutwardSuccess = (entry: ForginOutwardEntry) => {
        const newId = Math.max(...outwardEntries.map(e => e.id), 0) + 1;
        setOutwardEntries([...outwardEntries, { id: newId, ...entry }]);
    };

    const filteredInwardEntries = inwardEntries.filter(entry =>
        entry.challanNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.partyName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredOutwardEntries = outwardEntries.filter(entry =>
        entry.challanNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.partyName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Forging Management</h1>
                    <p className="page-subtitle">Manage Forging Inward and Outward entries</p>
                </div>
                <div className="header-actions">
                    <button
                        type="button"
                        className="action-button primary-button"
                        onClick={handleAdd}
                    >
                        <span className="button-icon">+</span>
                        <span className="button-text">
                            {activeTab === 'INWARD' ? 'Add Inward' : 'Add Outward'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Stats Cards - Placeholder Data */}
            <div className="casting-stats-grid" style={{ marginBottom: '24px' }}>
                <div className="casting-stat-card">
                    <span className="stat-title">Total Inward</span>
                    <span className="stat-value">1,250.00</span>
                </div>
                <div className="casting-stat-card">
                    <span className="stat-title">Total Outward</span>
                    <span className="stat-value">980.50</span>
                </div>
                <div className="casting-stat-card">
                    <span className="stat-title">Net Stock</span>
                    <span className="stat-value">269.50</span>
                </div>
                <div className="casting-stat-card">
                    <span className="stat-title">Pending Orders</span>
                    <span className="stat-value">12</span>
                </div>
            </div>

            {/* Segmented Control Navigation */}
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
                    onClick={() => handleTabChange('INWARD')}
                    style={{
                        flex: 1,
                        cursor: 'pointer',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: activeTab === 'INWARD' ? '#ffffff' : 'transparent',
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '16px',
                        fontWeight: activeTab === 'INWARD' ? '600' : '500',
                        color: activeTab === 'INWARD' ? '#0d6efd' : '#495057',
                        boxShadow: activeTab === 'INWARD' ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none',
                        transition: 'all 0.2s ease',
                        height: 'auto',
                        minHeight: 'unset'
                    }}
                >
                    Inward
                </button>
                <div style={{ width: '0px' }}></div>
                <button
                    onClick={() => handleTabChange('OUTWARD')}
                    style={{
                        flex: 1,
                        cursor: 'pointer',
                        border: 'none',
                        outline: 'none',
                        backgroundColor: activeTab === 'OUTWARD' ? '#ffffff' : 'transparent',
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '16px',
                        fontWeight: activeTab === 'OUTWARD' ? '600' : '500',
                        color: activeTab === 'OUTWARD' ? '#0d6efd' : '#495057',
                        boxShadow: activeTab === 'OUTWARD' ? '0 2px 4px rgba(0, 0, 0, 0.05)' : 'none',
                        transition: 'all 0.2s ease',
                        height: 'auto',
                        minHeight: 'unset'
                    }}
                >
                    Outward
                </button>
            </div>

            {/* Content Area */}
            <div className="inventory-table-container" style={{ padding: '0', background: 'transparent', boxShadow: 'none', border: 'none' }}>
                <div className="order-filters" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                    <div className="order-search">
                        <img src={SearchIcon} alt="Search" />
                        <input
                            type="text"
                            placeholder="Search by Challan or Party"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="action-button secondary-button"
                            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            onClick={() => setIsDownloadOptionsOpen(true)} // Open Download Options
                        >
                            <span className="button-text">Download</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                        </button>
                        <button className="action-button secondary-button" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="button-text">Filter</span>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="inventory-table-container" style={{ border: 'none', boxShadow: 'none' }}>
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Party Name</th>
                                <th>Challan No.</th>
                                <th>Weight</th>
                                <th>Unit</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(activeTab === 'INWARD' ? filteredInwardEntries : filteredOutwardEntries).map((entry) => (
                                <tr key={entry.id}>
                                    <td>{entry.date}</td>
                                    <td>{entry.partyName}</td>
                                    <td>{entry.challanNo}</td>
                                    <td>{entry.weight}</td>
                                    <td>{entry.unit}</td>
                                    <td>{entry.price}</td>
                                </tr>
                            ))}
                            {(activeTab === 'INWARD' ? filteredInwardEntries : filteredOutwardEntries).length === 0 && (
                                <tr>
                                    <td colSpan={6} className="no-data">No entries found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isInwardModalOpen && (
                <AddForginInwardModal
                    onClose={() => setIsInwardModalOpen(false)}
                    onSuccess={handleAddInwardSuccess}
                />
            )}

            {isOutwardModalOpen && (
                <AddForginOutwardModal
                    onClose={() => setIsOutwardModalOpen(false)}
                    onSuccess={handleAddOutwardSuccess}
                />
            )}

            {/* Download Options Modal */}
            {isDownloadOptionsOpen && (
                <ForginDownloadOptionsModal
                    onClose={() => setIsDownloadOptionsOpen(false)}
                    onNext={(partyName, startDate, endDate) => {
                        setReportOptions({ party: partyName, start: startDate, end: endDate });
                        setIsDownloadOptionsOpen(false);
                        setIsReportOpen(true);
                    }}
                />
            )}

            {/* Report Modal */}
            {isReportOpen && reportOptions && (
                <ForginReportModal
                    onClose={() => setIsReportOpen(false)}
                    partyName={reportOptions.party}
                    startDate={reportOptions.start}
                    endDate={reportOptions.end}
                    // Filter logic: using Party Name and Date Range
                    inwardData={inwardEntries.filter(e =>
                        e.partyName === reportOptions.party &&
                        e.date >= reportOptions.start &&
                        e.date <= reportOptions.end
                    )}
                    outwardData={outwardEntries.filter(e =>
                        e.partyName === reportOptions.party &&
                        e.date >= reportOptions.start &&
                        e.date <= reportOptions.end
                    )}
                />
            )}
        </div>
    );
};

export default ForginPage;
