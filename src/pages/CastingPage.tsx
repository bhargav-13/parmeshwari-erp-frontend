import React, { useState, useEffect } from 'react';
import './InventoryPage.css';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import AddCastingEntryModal from '../components/AddCastingEntryModal';
import AddCastingSellModal from '../components/AddCastingSellModal';
import { castingApi, castingSaleApi } from '../api/casting';
import type { CastingEntry, CastingSale } from '../types';
import Loading from '../components/Loading';

// Inline Download Icon for now
const DownloadIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);

type Tab = 'coming' | 'sell';

const CastingPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('coming');
    const [searchQuery, setSearchQuery] = useState('');
    const [entries, setEntries] = useState<CastingEntry[]>([]);
    const [sellEntries, setSellEntries] = useState<CastingSale[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSellModalOpen, setIsSellModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch casting entries
    useEffect(() => {
        if (activeTab === 'coming') {
            fetchCastingEntries();
        } else {
            fetchCastingSales();
        }
    }, [activeTab]);

    const fetchCastingEntries = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await castingApi.getAllCastings();
            setEntries(data);
        } catch (err: any) {
            console.error('Error fetching casting entries:', err);
            setError('Failed to load casting entries. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCastingSales = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await castingSaleApi.getAllCastingSales();
            setSellEntries(data);
        } catch (err: any) {
            console.error('Error fetching casting sales:', err);
            setError('Failed to load casting sales. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleAddEntry = async (newEntry: Omit<CastingEntry, 'id'>) => {
        try {
            await castingApi.createCasting(newEntry);
            await fetchCastingEntries();
            setIsAddModalOpen(false);
        } catch (err: any) {
            console.error('Error creating casting entry:', err);
            alert('Failed to create casting entry. Please try again.');
        }
    };

    const handleAddSellEntry = async (newEntry: Omit<CastingSale, 'id' | 'totalAmount'>) => {
        try {
            await castingSaleApi.createCastingSale(newEntry);
            await fetchCastingSales();
            setIsSellModalOpen(false);
        } catch (err: any) {
            console.error('Error creating casting sale:', err);
            alert('Failed to create casting sale. Please try again.');
        }
    };

    const handleDownloadPdf = async () => {
        try {
            const blob = activeTab === 'coming'
                ? await castingApi.downloadCastingPdf()
                : await castingSaleApi.downloadCastingSalePdf();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `casting-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error('Error downloading PDF:', err);
            alert('Failed to download PDF. Please try again.');
        }
    };

    // Calculate dynamic stats for Coming Tab
    const totalMell = entries.reduce((sum, entry) => sum + entry.mell, 0);
    const totalBrass = entries.reduce((sum, entry) => sum + entry.brass, 0);

    // Calculate dynamic stats for Sell Tab
    const totalKadi = sellEntries.reduce((sum, entry) => sum + (entry.kadi || 0), 0);
    const totalKadiAmount = sellEntries.reduce((sum, entry) => sum + (entry.kadiAmount || 0), 0);
    const totalLokhand = sellEntries.reduce((sum, entry) => sum + (entry.lokhand || 0), 0);
    const totalLokhandAmount = sellEntries.reduce((sum, entry) => sum + (entry.lokhandAmount || 0), 0);

    if (loading) {
        return <Loading message="Loading casting data..." />;
    }

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Casting Management</h1>
                    <p className="page-subtitle">Manage casting processes, materials efficiently</p>
                </div>
                <div className="header-actions">
                    {activeTab === 'coming' ? (
                        <button
                            type="button"
                            className="action-button primary-button"
                            onClick={() => setIsAddModalOpen(true)}
                        >
                            <span className="button-icon">+</span>
                            <span className="button-text">Add casting Entry</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            className="action-button primary-button"
                            onClick={() => setIsSellModalOpen(true)}
                        >
                            <span className="button-icon">+</span>
                            <span className="button-text">Add Sell Entry</span>
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div style={{ padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            <div className="casting-toggle-container">
                <button
                    className={`casting-toggle-btn ${activeTab === 'coming' ? 'active' : ''}`}
                    onClick={() => setActiveTab('coming')}
                >
                    Coming
                </button>
                <button
                    className={`casting-toggle-btn ${activeTab === 'sell' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sell')}
                >
                    Sell
                </button>
            </div>

            <div className="casting-content-wrapper">
                {activeTab === 'coming' && (
                    <>
                        <div className="casting-stats-grid">
                            <div className="casting-stat-card">
                                <span className="stat-title">Total Mell</span>
                                <span className="stat-value">{totalMell.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                            </div>
                            <div className="casting-stat-card">
                                <span className="stat-title">Total Brass</span>
                                <span className="stat-value">{totalBrass.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                            </div>
                        </div>

                        <div className="order-filters">
                            <div className="order-search">
                                <img src={SearchIcon} alt="Search" />
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="order-status-filter" onClick={handleDownloadPdf}>
                                <span className="button-text">Download</span>
                                <DownloadIcon />
                            </button>
                            <button className="order-status-filter">
                                <img src={FilterIcon} alt="Filter" />
                                <span className="button-text">Filter</span>
                            </button>
                        </div>

                        <div className="casting-table-container">
                            <table className="casting-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Mell</th>
                                        <th>Brass</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map((row, index) => (
                                        <tr key={index}>
                                            <td>{row.date}</td>
                                            <td>{row.mell.toFixed(3)}</td>
                                            <td>{row.brass.toFixed(3)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
                {activeTab === 'sell' && (
                    <>
                        <div className="sell-stats-grid">
                            <div className="casting-stat-card">
                                <span className="stat-title">Total Kadi</span>
                                <span className="stat-value">{totalKadi.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                            </div>
                            <div className="casting-stat-card">
                                <span className="stat-title">Total Kadi Amount</span>
                                <span className="stat-value">₹{totalKadiAmount.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="casting-stat-card">
                                <span className="stat-title">Total Lokhand</span>
                                <span className="stat-value">{totalLokhand.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                            </div>
                            <div className="casting-stat-card">
                                <span className="stat-title">Total Lokhand Amount</span>
                                <span className="stat-value">₹{totalLokhandAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <div className="order-filters">
                            <div className="order-search">
                                <img src={SearchIcon} alt="Search" />
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="order-status-filter" onClick={handleDownloadPdf}>
                                <span className="button-text">Download</span>
                                <DownloadIcon />
                            </button>
                            <button className="order-status-filter">
                                <img src={FilterIcon} alt="Filter" />
                                <span className="button-text">Filter</span>
                            </button>
                        </div>

                        <div className="casting-table-container">
                            <table className="casting-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Kadi</th>
                                        <th>Rate</th>
                                        <th>Amount</th>
                                        <th>Lokhand</th>
                                        <th>Rate</th>
                                        <th>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sellEntries.map((row, index) => (
                                        <tr key={index}>
                                            <td>{row.date}</td>
                                            <td>{row.kadi ? row.kadi.toFixed(3) : ''}</td>
                                            <td>{row.kadiRate ? row.kadiRate : ''}</td>
                                            <td>{row.kadiAmount ? row.kadiAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                                            <td>{row.lokhand ? row.lokhand.toFixed(3) : ''}</td>
                                            <td>{row.lokhandRate ? row.lokhandRate : ''}</td>
                                            <td>{row.lokhandAmount ? row.lokhandAmount.toLocaleString('en-IN') : ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            {isAddModalOpen && (
                <AddCastingEntryModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={handleAddEntry}
                />
            )}

            {isSellModalOpen && (
                <AddCastingSellModal
                    onClose={() => setIsSellModalOpen(false)}
                    onSuccess={handleAddSellEntry}
                />
            )}
        </div>
    );
};

export default CastingPage;
