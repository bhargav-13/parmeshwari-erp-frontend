import React, { useState, useEffect } from 'react';
import type { Party } from '../types';
import Loading from '../components/Loading';
import AddPartyModal from '../components/AddPartyModal';
import './InventoryPage.css'; // Reuse existing styles
import SearchIcon from '../assets/search.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';

import { MOCK_PARTIES } from '../data/mockParties';

const PartyMasterPage: React.FC = () => {
    const [parties, setParties] = useState<Party[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        // Simulate API call
        const fetchParties = async () => {
            setLoading(true);
            setTimeout(() => {
                setParties(MOCK_PARTIES);
                setLoading(false);
            }, 800);
        };
        fetchParties();
    }, []);

    const handleDelete = async (partyId: number) => {
        if (!window.confirm('Are you sure you want to delete this party?')) return;
        setDeletingId(partyId);
        // Simulate delete
        setTimeout(() => {
            setParties(parties.filter(p => p.partyId !== partyId));
            setDeletingId(null);
        }, 500);
        console.log('Deleted party:', partyId);
    };

    const handleSuccess = (newParty: Party) => {
        setParties([...parties, newParty]);
    };

    const handleEdit = (party: Party) => {
        // console.log('Edit party:', party);
        // setIsAddModalOpen(true);
    };

    const handleAddParty = () => {
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
                            <th>Opening Balance</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredParties.map((party, index) => (
                            <tr key={party.partyId}>
                                <td>{String(index + 1).padStart(2, '0')}</td>
                                <td>{party.partyId}</td>
                                <td>{party.name}</td>
                                <td>₹{party.openingBalance.toLocaleString('en-IN')}</td>
                                <td>
                                    <div className="action-buttons">
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
                    onClose={() => setIsAddModalOpen(false)}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
};

export default PartyMasterPage;
