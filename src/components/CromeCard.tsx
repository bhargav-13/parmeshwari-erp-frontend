import React, { useState } from 'react';
import { format } from 'date-fns';
import type { Crome, CromeReturnRequest } from '../types';
import { SubcontractingStatus } from '../types';
import { cromeApi } from '../api/crome';
import CromeReturnModal from './CromeReturnModal';
import DeleteIcon from '../assets/delete.svg';
import ReturnIcon from '../assets/return.svg';
import './SubcontractingCard.css'; // Reusing the same styles
import '../styles/StatusDropdown.css';

interface CromeCardProps {
    crome: Crome;
    onDelete: (id: number) => void;
    onRefresh: () => void;
}

const CromeCard: React.FC<CromeCardProps> = ({ crome, onDelete, onRefresh }) => {
    const [status, setStatus] = useState(crome.status);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

    const formatDate = (dateString: string) => {
        return format(new Date(dateString), 'dd-MM-yyyy');
    };

    const getStatusClass = (status: SubcontractingStatus) => {
        switch (status) {
            case SubcontractingStatus.COMPLETED:
                return 'status-completed';
            case SubcontractingStatus.IN_PROCESS:
                return 'status-in-process';
            case SubcontractingStatus.REJECTED:
                return 'status-rejected';
            default:
                return '';
        }
    };

    const handleStatusChange = async (newStatus: SubcontractingStatus) => {
        try {
            setIsUpdatingStatus(true);
            await cromeApi.updateCromeStatus(crome.cromeId, newStatus);
            setStatus(newStatus);
            onRefresh();
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this crome order?')) {
            try {
                setIsDeleting(true);
                await onDelete(crome.cromeId);
            } catch (error) {
                console.error('Error deleting:', error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleReturn = async (data: CromeReturnRequest) => {
        try {
            await cromeApi.returnCrome(crome.cromeId, data);
            setIsReturnModalOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error recording return:', error);
            throw error;
        }
    };

    // Calculate net return stock if there's a return
    const netReturnStock = crome.cromeReturn
        ? crome.cromeReturn.netReturnStock
        : 0;

    return (
        <div className="subcontracting-card">
            <div className="card-header">
                <div className="card-header-left">
                    <div className="card-title-group">
                        <div className="card-title-row">
                            <h3 className="card-order-id">
                                CRM-{crome.cromeId}
                            </h3>
                            <span className="card-sub-id">
                                (Linked to PBI-{crome.subcontractingId})
                            </span>
                        </div>
                        <div className="card-info-row">
                            <span className="info-label">Party:</span>
                            <span className="info-value">{crome.partyName}</span>
                        </div>
                        <div className="card-info-row">
                            <span className="info-label">Contractor:</span>
                            <span className="info-value">{crome.contractorName}</span>
                        </div>
                    </div>

                    <div className="card-actions">
                        <button
                            type="button"
                            className="icon-button delete-button"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            title="Delete"
                        >
                            {isDeleting ? (
                                <span className="loading-icon"></span>
                            ) : (
                                <img src={DeleteIcon} alt="Delete" className="icon-img" />
                            )}
                        </button>
                    </div>
                </div>

                <div className="card-dates">
                    <span className="card-date">Crome Date : {formatDate(crome.cromeDate)}</span>
                    {crome.cromeReturn?.returnDate && (
                        <span className="card-date">Return Date : {formatDate(crome.cromeReturn.returnDate)}</span>
                    )}
                </div>
            </div>

            <div className="card-body">
                <div className="material-section">
                    <h4 className="section-title">{crome.itemName}</h4>
                    <p className="card-contractor" style={{ textAlign: 'center', marginTop: '-8px' }}>
                        Contractor: {crome.contractorName}
                    </p>

                    <div className="stock-info">
                        <div className="stock-item">
                            <span className="stock-label">Sent Stock</span>
                            <div className="stock-values">
                                <span className="stock-value">
                                    {crome.sentStock.toFixed(3)} {crome.unit}
                                </span>
                            </div>
                        </div>

                        <div className="stock-item">
                            <span className="stock-label">Packaging</span>
                            <div className="stock-values">
                                <span className="stock-value">
                                    {(crome.packagingWeight * crome.packagingCount).toFixed(3)} {crome.unit}
                                </span>
                                <span className="stock-pieces">
                                    {crome.packagingCount} x {crome.packagingWeight} {crome.unit} ({crome.packagingType})
                                </span>
                            </div>
                        </div>

                        <div className="stock-item">
                            <span className="stock-label">Gross Weight</span>
                            <div className="stock-values">
                                <span className="stock-value">
                                    {crome.grossWeight.toFixed(3)} {crome.unit}
                                </span>
                            </div>
                        </div>

                        {crome.cromeReturn && (
                            <div className="stock-item">
                                <span className="stock-label">Net Return</span>
                                <div className="stock-values">
                                    <span className="stock-value">
                                        {netReturnStock.toFixed(3)} {crome.unit}
                                    </span>
                                    <span className="stock-pieces">
                                        Return: {crome.cromeReturn.returnStock.toFixed(3)} {crome.unit}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="processes-section">
                        <span className="processes-label">Status</span>

                        <div className="process-actions">
                            <select
                                value={status}
                                onChange={(e) => handleStatusChange(e.target.value as SubcontractingStatus)}
                                className={`status-select-modern ${getStatusClass(status)}`}
                                disabled={isUpdatingStatus}
                                title="Update crome status"
                            >
                                <option value={SubcontractingStatus.IN_PROCESS}>
                                    {isUpdatingStatus ? 'Updating...' : 'In Process'}
                                </option>
                                <option value={SubcontractingStatus.COMPLETED}>Completed</option>
                                <option value={SubcontractingStatus.REJECTED}>Rejected</option>
                            </select>

                            {!crome.cromeReturn && (
                                <button
                                    type="button"
                                    className="return-record-button"
                                    onClick={() => setIsReturnModalOpen(true)}
                                >
                                    <img src={ReturnIcon} alt="Return" className="return-icon" />
                                    <span>Return Record</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {crome.remark && (
                        <div className="remark-section">
                            <span className="remark-label">Remark:</span>
                            <p className="remark-text">{crome.remark}</p>
                        </div>
                    )}

                    {crome.cromeReturn?.returnRemark && (
                        <div className="remark-section">
                            <span className="remark-label">Return Remark:</span>
                            <p className="remark-text">{crome.cromeReturn.returnRemark}</p>
                        </div>
                    )}
                </div>
            </div>

            {isReturnModalOpen && (
                <CromeReturnModal
                    cromeId={crome.cromeId}
                    itemName={crome.itemName}
                    crome={crome}
                    onClose={() => setIsReturnModalOpen(false)}
                    onSubmit={handleReturn}
                />
            )}
        </div>
    );
};

export default CromeCard;
