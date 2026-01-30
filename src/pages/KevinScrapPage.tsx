import React, { useState, useEffect } from 'react';
import { kevinScrapApi, type KevinScrap, type KevinScrapRequest } from '../api/scrap';
import ScrapEntryModal from '../components/ScrapEntryModal';
import Pagination from '../components/Pagination';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import FilterIcon from '../assets/filter.svg';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import './KevinScrapPage.css';

interface KevinScrapStats {
    totalEntries: number;
    totalNetWeight: number;
}

const KevinScrapPage: React.FC = () => {
    const [scraps, setScraps] = useState<KevinScrap[]>([]);
    const [stats, setStats] = useState<KevinScrapStats>({
        totalEntries: 0,
        totalNetWeight: 0,
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingScrap, setEditingScrap] = useState<KevinScrap | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalElements, setTotalElements] = useState(0);

    useEffect(() => {
        fetchScraps();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, searchQuery]);

    const fetchScraps = async () => {
        try {
            setLoading(true);
            const response = await kevinScrapApi.getScrapList({
                page,
                size: 10,
                search: searchQuery || undefined,
            });

            setScraps(response.data);
            setTotalPages(response.totalPages);
            setTotalElements(response.totalElements);

            // Calculate stats
            calculateStats(response.data);
        } catch (error) {
            console.error('Error fetching Kevin scraps:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data: KevinScrap[]) => {
        const totalNetWeight = data.reduce((sum, s) => sum + (s.netWeight || 0), 0);

        setStats({
            totalEntries: data.length,
            totalNetWeight,
        });
    };

    const handleAddScrap = async (data: KevinScrapRequest) => {
        try {
            if (editingScrap) {
                await kevinScrapApi.updateScrap(editingScrap.scrapId, data);
            } else {
                await kevinScrapApi.addScrap(data);
            }
            setIsModalOpen(false);
            setEditingScrap(null);
            fetchScraps();
        } catch (error) {
            console.error('Error saving Kevin scrap:', error);
            throw error;
        }
    };

    const handleEditScrap = (scrap: KevinScrap) => {
        setEditingScrap(scrap);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingScrap(null);
    };

    const handleDeleteScrap = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this scrap entry?')) {
            try {
                await kevinScrapApi.deleteScrap(id);
                fetchScraps();
            } catch (error) {
                console.error('Error deleting Kevin scrap:', error);
            }
        }
    };

    return (
        <div className="kevin-scrap-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Kevin Scrap Management</h1>
                    <p className="page-subtitle">Track scrap materials and processing for Kevin.</p>
                </div>

                <button type="button" className="add-button" onClick={() => setIsModalOpen(true)}>
                    <span className="add-icon">+</span>
                    <span className="add-text">Add Scrap Entry</span>
                </button>
            </div>

            <div className="stats-cards">
                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Entries</span>
                        <span className="stat-value">{totalElements}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-content">
                        <span className="stat-label">Total Net Weight</span>
                        <span className="stat-value">{stats.totalNetWeight.toFixed(3)} kg</span>
                    </div>
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
                <div className="order-status-filter">
                    <img src={FilterIcon} alt="Filter" />
                    <span>Filter</span>
                </div>
            </div>

            <div className="scrap-table-container">
                {loading ? (
                    <Loading message="Loading scrap entries..." size="large" />
                ) : scraps.length === 0 ? (
                    <div className="no-data">No scrap entries found.</div>
                ) : (
                    <table className="scrap-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Challan No.</th>
                                <th>Name</th>
                                <th>Item</th>
                                <th>Bag</th>
                                <th>Weight</th>
                                <th>Out Weight</th>
                                <th>Net Weight</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {scraps.map((scrap) => (
                                <tr key={scrap.scrapId}>
                                    <td>{new Date(scrap.orderDate).toLocaleDateString('en-GB')}</td>
                                    <td>{scrap.challanNo}</td>
                                    <td>{scrap.contractor.name}</td>
                                    <td>{scrap.item}</td>
                                    <td>{scrap.elementValue}</td>
                                    <td>{scrap.totalWeight.toFixed(3)}kg</td>
                                    <td>{scrap.outWeight.toFixed(3)}kg</td>
                                    <td>{scrap.netWeight.toFixed(3)}kg</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button
                                                type="button"
                                                className="icon-button"
                                                onClick={() => handleEditScrap(scrap)}
                                                title="Edit"
                                            >
                                                <img src={EditIcon} alt="Edit" className="icon-img" />
                                            </button>
                                            <button
                                                type="button"
                                                className="icon-button"
                                                onClick={() => handleDeleteScrap(scrap.scrapId)}
                                                title="Delete"
                                            >
                                                <img src={DeleteIcon} alt="Delete" className="icon-img" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                totalElements={totalElements}
                size={10}
            />

            {isModalOpen && (
                <ScrapEntryModal
                    onClose={handleModalClose}
                    onSubmit={handleAddScrap}
                    scrapType="kevin"
                    initialData={editingScrap ? {
                        scrapContractorId: editingScrap.contractor.scrapContractorId,
                        challanNo: editingScrap.challanNo,
                        orderDate: editingScrap.orderDate,
                        item: editingScrap.item,
                        elementValue: editingScrap.elementValue,
                        elementType: editingScrap.elementType,
                        totalWeight: editingScrap.totalWeight,
                        outWeight: editingScrap.outWeight,
                        netWeight: editingScrap.netWeight,
                    } : undefined}
                />
            )}
        </div>
    );
};

export default KevinScrapPage;
