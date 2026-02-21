import React, { useState, useEffect } from 'react';
import './CastingPage.css';
import '../components/AddProductModal.css';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import AddForgingInwardModal from '../components/AddForgingInwardModal';
import AddForgingOutwardModal from '../components/AddForgingOutwardModal';
import { forgingInwardApi, forgingOutwardApi } from '../api/forging';
import type { ForgingInward, ForgingOutward } from '../types';
import Loading from '../components/Loading';

// Download Icon
const DownloadIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);

type Tab = 'inward' | 'outward';

const ForgingPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>('inward');
    const [searchQuery, setSearchQuery] = useState('');
    const [inwardEntries, setInwardEntries] = useState<ForgingInward[]>([]);
    const [outwardEntries, setOutwardEntries] = useState<ForgingOutward[]>([]);
    const [isInwardModalOpen, setIsInwardModalOpen] = useState(false);
    const [isOutwardModalOpen, setIsOutwardModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDownloadPopupOpen, setIsDownloadPopupOpen] = useState(false);
    const [downloadPartyName, setDownloadPartyName] = useState('');
    const [downloadFromDate, setDownloadFromDate] = useState('');
    const [downloadToDate, setDownloadToDate] = useState('');

    // Fetch forging entries
    useEffect(() => {
        fetchInwardEntries();
        fetchOutwardEntries();
    }, []);

    const fetchInwardEntries = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await forgingInwardApi.getAll();
            setInwardEntries(data);
        } catch (err: any) {
            console.error('Error fetching forging inward entries:', err);
            setError('Failed to load forging inward entries. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchOutwardEntries = async () => {
        try {
            const data = await forgingOutwardApi.getAll();
            setOutwardEntries(data);
        } catch (err: any) {
            console.error('Error fetching forging outward entries:', err);
        }
    };

    const handleAddInward = async (newEntry: Omit<ForgingInward, 'id'>) => {
        try {
            await forgingInwardApi.create(newEntry);
            await fetchInwardEntries();
            setIsInwardModalOpen(false);
        } catch (err: any) {
            console.error('Error creating forging inward entry:', err);
            alert('Failed to create forging inward entry. Please try again.');
        }
    };

    const handleAddOutward = async (newEntry: Omit<ForgingOutward, 'id'>) => {
        try {
            await forgingOutwardApi.create(newEntry);
            await fetchOutwardEntries();
            setIsOutwardModalOpen(false);
        } catch (err: any) {
            console.error('Error creating forging outward entry:', err);
            alert('Failed to create forging outward entry. Please try again.');
        }
    };

    const handleDownload = async () => {
        try {
            setIsDownloading(true);
            // Convert YYYY-MM-DD (HTML date input) to DD/MM/YYYY for formatDateForAPI inside the service
            const fromDate = downloadFromDate || undefined;
            const toDate = downloadToDate || undefined;
            const partyName = downloadPartyName.trim() || undefined;
            if (activeTab === 'inward') {
                await forgingInwardApi.downloadPdf(partyName, fromDate, toDate);
            } else {
                await forgingOutwardApi.downloadPdf(partyName, fromDate, toDate);
            }
            setIsDownloadPopupOpen(false);
        } catch (err: any) {
            console.error('Error downloading PDF:', err);
            alert('Failed to download PDF report. Please try again.');
        } finally {
            setIsDownloading(false);
        }
    };

    // Calculate totals
    const calculateTotalWeight = (entries: (ForgingInward | ForgingOutward)[]) => {
        return entries.reduce((sum, entry) => sum + entry.weight, 0);
    };

    const totalInward = calculateTotalWeight(inwardEntries);
    const totalOutward = calculateTotalWeight(outwardEntries);
    const netStock = totalInward - totalOutward;
    const pendingOrders = inwardEntries.length + outwardEntries.length; // Placeholder logic

    // Filter entries based on search query
    const filterEntries = (entries: (ForgingInward | ForgingOutward)[]) => {
        if (!searchQuery) return entries;
        const query = searchQuery.toLowerCase();
        return entries.filter(entry =>
            entry.partyName.toLowerCase().includes(query) ||
            entry.challanNo.toLowerCase().includes(query)
        );
    };

    const filteredInwardEntries = filterEntries(inwardEntries);
    const filteredOutwardEntries = filterEntries(outwardEntries);

    if (loading) {
        return <Loading message="Loading forging data..." />;
    }

    return (
        <div className="casting-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Forging Management</h1>
                    <p className="page-subtitle">Manage Forging Inward and Outward entries</p>
                </div>
                <div className="header-actions">
                    <button
                        type="button"
                        className="action-button primary-button"
                        onClick={() => activeTab === 'inward' ? setIsInwardModalOpen(true) : setIsOutwardModalOpen(true)}
                    >
                        <span className="button-icon">+</span>
                        <span className="button-text">Add {activeTab === 'inward' ? 'Inward' : 'Outward'}</span>
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            {/* Stats Grid - 2x2 */}
            <div className="sell-stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', marginBottom: '24px' }}>
                <div className="casting-stat-card">
                    <span className="stat-title">Total Inward</span>
                    <span className="stat-value">{totalInward.toFixed(2)}</span>
                </div>
                <div className="casting-stat-card">
                    <span className="stat-title">Total Outward</span>
                    <span className="stat-value">{totalOutward.toFixed(2)}</span>
                </div>
                <div className="casting-stat-card">
                    <span className="stat-title">Net Stock</span>
                    <span className="stat-value">{netStock.toFixed(2)}</span>
                </div>
                <div className="casting-stat-card">
                    <span className="stat-title">Pending Orders</span>
                    <span className="stat-value">{pendingOrders}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="casting-toggle-container">
                <button
                    className={`casting-toggle-btn ${activeTab === 'inward' ? 'active' : ''}`}
                    onClick={() => setActiveTab('inward')}
                >
                    Inward
                </button>
                <button
                    className={`casting-toggle-btn ${activeTab === 'outward' ? 'active' : ''}`}
                    onClick={() => setActiveTab('outward')}
                >
                    Outward
                </button>
            </div>

            {/* Search and Actions */}
            <div className="order-filters">
                <div className="order-search">
                    <img src={SearchIcon} alt="Search" />
                    <input
                        type="text"
                        placeholder="Search by Challan or Party"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button
                    className="order-status-filter"
                    onClick={() => setIsDownloadPopupOpen(true)}
                    title={`Download ${activeTab === 'inward' ? 'Inward' : 'Outward'} PDF Report`}
                >
                    <span className="button-text">Download</span>
                    <DownloadIcon />
                </button>
                <button className="order-status-filter">
                    <span className="button-text">Filter</span>
                    <img src={FilterIcon} alt="Filter" />
                </button>
            </div>

            {/* Table */}
            <div className="casting-table-container">
                <table className="casting-table">
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
                        {activeTab === 'inward' ? (
                            filteredInwardEntries.length > 0 ? (
                                filteredInwardEntries.map((row, index) => (
                                    <tr key={row.id || index}>
                                        <td>{row.date}</td>
                                        <td>{row.partyName}</td>
                                        <td>{row.challanNo}</td>
                                        <td>{row.weight}</td>
                                        <td>{row.weightUnit}</td>
                                        <td>-</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#8E8E8E' }}>
                                        No inward entries found
                                    </td>
                                </tr>
                            )
                        ) : (
                            filteredOutwardEntries.length > 0 ? (
                                filteredOutwardEntries.map((row, index) => (
                                    <tr key={row.id || index}>
                                        <td>{row.date}</td>
                                        <td>{row.partyName}</td>
                                        <td>{row.challanNo}</td>
                                        <td>{row.weight}</td>
                                        <td>{row.weightUnit}</td>
                                        <td>-</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#8E8E8E' }}>
                                        No outward entries found
                                    </td>
                                </tr>
                            )
                        )}
                    </tbody>
                </table>
            </div>

            {isInwardModalOpen && (
                <AddForgingInwardModal
                    onClose={() => setIsInwardModalOpen(false)}
                    onSuccess={handleAddInward}
                />
            )}

            {isOutwardModalOpen && (
                <AddForgingOutwardModal
                    onClose={() => setIsOutwardModalOpen(false)}
                    onSuccess={handleAddOutward}
                />
            )}

            {/* Download Filter Popup */}
            {isDownloadPopupOpen && (
                <div className="modal-overlay" onClick={() => setIsDownloadPopupOpen(false)}>
                    <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="modal-title">
                            Download {activeTab === 'inward' ? 'Inward' : 'Outward'} PDF
                        </h2>

                        <p className="form-label" style={{ marginBottom: '1rem', fontWeight: 400 }}>
                            All fields are optional — leave blank to download the full report.
                        </p>

                        <div className="modal-form">
                            <div className="form-group">
                                <label className="form-label">Party Name <span style={{ opacity: 0.5 }}>(optional)</span></label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. Ravi Enterprises"
                                    value={downloadPartyName}
                                    onChange={e => setDownloadPartyName(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">From Date <span style={{ opacity: 0.5 }}>(optional)</span></label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={downloadFromDate}
                                    onChange={e => setDownloadFromDate(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">To Date <span style={{ opacity: 0.5 }}>(optional)</span></label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={downloadToDate}
                                    onChange={e => setDownloadToDate(e.target.value)}
                                />
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    className="save-button"
                                    onClick={handleDownload}
                                    disabled={isDownloading}
                                >
                                    {isDownloading ? 'Downloading...' : 'Download PDF'}
                                </button>
                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() => setIsDownloadPopupOpen(false)}
                                    disabled={isDownloading}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ForgingPage;
