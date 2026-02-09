import React, { useState, useEffect } from 'react';
import type { Party } from '../types';
import Loading from '../components/Loading';
import AddPartyModal from '../components/AddPartyModal';
import PartyOrdersModal from '../components/PartyOrdersModal';
import './InventoryPage.css'; // Reuse existing styles
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import ViewIcon from '../assets/view.svg';

import { partyApi } from '../api/party';

const PartyMasterPage: React.FC = () => {
    const [parties, setParties] = useState<Party[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editingParty, setEditingParty] = useState<Party | undefined>(undefined);
    const [viewingParty, setViewingParty] = useState<Party | null>(null);

    useEffect(() => {
        fetchParties();
    }, [searchQuery]);

    const fetchParties = async () => {
        try {
            setLoading(true);
            setError(null);
            // Only pass search if it has a value to avoid backend null pointer
            const data = await partyApi.getAllParties(searchQuery.trim() || undefined);
            setParties(data);
        } catch (err: any) {
            console.error('Error fetching parties:', err);
            setError('Failed to load parties. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (partyId: number) => {
        if (!window.confirm('Are you sure you want to delete this party?')) return;
        setDeletingId(partyId);
        try {
            await partyApi.deleteParty(partyId);
            setParties(parties.filter(p => p.partyId !== partyId));
        } catch (err: any) {
            console.error('Error deleting party:', err);
            alert('Failed to delete party. Please try again.');
        } finally {
            setDeletingId(null);
        }
    };

    const handleSuccess = async () => {
        await fetchParties();
        setIsAddModalOpen(false);
        setEditingParty(undefined);
    };

    const handleEdit = (party: Party) => {
        setEditingParty(party);
        setIsAddModalOpen(true);
    };

    const handleAddParty = () => {
        setEditingParty(undefined);
        setIsAddModalOpen(true);
    };

    const filteredParties = parties.filter((party) =>
        party.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <Loading message="Loading parties..." />;
    }

    return (
        <div className="inventory-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Party Management</h1>
                    <p className="page-subtitle">Manage your parties</p>
                </div>

                <div className="header-actions">
                    <button
                        type="button"
                        className="action-button primary-button"
                        onClick={handleAddParty}
                    >
                        <span className="button-icon">+</span>
                        <span className="button-text">Add Party</span>
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '1rem', backgroundColor: '#fee', color: '#c33', borderRadius: '4px', marginBottom: '1rem' }}>
                    {error}
                </div>
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
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="inventory-table-container">
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Sr. No</th>
                            <th>Party ID</th>
                            <th>Party Name</th>
                            <th>Amount</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredParties.map((party, index) => (
                            <tr key={party.partyId}>
                                <td>{String(index + 1).padStart(2, '0')}</td>
                                <td>{party.partyId}</td>
                                <td>{party.name}</td>
                                <td>₹{party.amount.toLocaleString('en-IN')}</td>
                                <td>
                                    <div className="action-buttons">
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
                                            onClick={() => handleEdit(party)}
                                            title="Edit"
                                        >
                                            <img src={EditIcon} alt="Edit" className="icon-img" />
                                        </button>
                                        <button
                                            type="button"
                                            className="icon-button"
                                            onClick={() => handleDelete(party.partyId)}
                                            disabled={deletingId === party.partyId}
                                            title="Delete"
                                        >
                                            {deletingId === party.partyId ? (
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
                                <td colSpan={5} className="no-data">
                                    No parties found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isAddModalOpen && (
                <AddPartyModal
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setEditingParty(undefined);
                    }}
                    onSuccess={handleSuccess}
                    initialData={editingParty}
                />
            )}

            {viewingParty && (
                <PartyOrdersModal
                    partyName={viewingParty.name}
                    onClose={() => setViewingParty(null)}
                />
            )}
        </div>
    );
};

export default PartyMasterPage;
