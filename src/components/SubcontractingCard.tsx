import React, { useState } from 'react';
import { format } from 'date-fns';
import type { Subcontracting, SubReturnRequest, SubOrderRequest } from '../types';
import { SubcontractingStatus } from '../types';
import { subcontractingApi } from '../api/subcontracting';
import ReturnRecordModal from './ReturnRecordModal';
import AddSubcontractingModal from './AddSubcontractingModal';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import ReturnIcon from '../assets/return.svg';
import './SubcontractingCard.css';
import '../styles/StatusDropdown.css';

interface SubcontractingCardProps {
  subcontract: Subcontracting;
  onDelete: (id: number) => void;
  onRefresh: () => void;
}

const SubcontractingCard: React.FC<SubcontractingCardProps> = ({ subcontract, onDelete, onRefresh }) => {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [status, setStatus] = useState(subcontract.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use backend-calculated values directly, rounded to 3 decimal places
  const returnStock = Math.round((subcontract.subReturn?.returnStock || 0) * 1000) / 1000;
  const usedStock = Math.round((subcontract.usedStock || (subcontract.sentStock - returnStock)) * 1000) / 1000;
  const totalAmount = subcontract.totalAmount || 0;

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


  const handleReturnRecord = async (data: SubReturnRequest) => {
    try {
      await subcontractingApi.returnSubcontracting(subcontract.subcontractingId, data);
      setIsReturnModalOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error returning record:', error);
      throw error;
    }
  };

  const handleStatusChange = async (newStatus: SubcontractingStatus) => {
    try {
      setIsUpdatingStatus(true);
      await subcontractingApi.updateSubcontractingStatus(subcontract.subcontractingId, newStatus);
      setStatus(newStatus);
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this subcontracting order?')) {
      try {
        setIsDeleting(true);
        await onDelete(subcontract.subcontractingId);
      } catch (error) {
        console.error('Error deleting:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleEdit = async (data: SubOrderRequest) => {
    try {
      await subcontractingApi.updateSubcontracting(subcontract.subcontractingId, data);
      setIsEditModalOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating subcontract:', error);
      throw error;
    }
  };

  // Prepare initial data for edit modal
  const initialEditData: SubOrderRequest = {
    contractorName: subcontract.contractorName,
    itemName: subcontract.itemName,
    orderDate: subcontract.orderDate,
    sentStock: subcontract.sentStock,
    jobWorkPay: subcontract.jobWorkPay,
    price: subcontract.price,
    unit: subcontract.unit,
    remark: subcontract.remark || '',
  };

  return (
    <div className="subcontracting-card">
      <div className="card-header">
        <div className="card-header-left">
          <div className="card-title-group">
            <h3 className="card-order-id">
              PBI-{subcontract.subcontractingId} ({new Date(subcontract.orderDate).getFullYear()})
            </h3>
            <p className="card-contractor">{subcontract.contractorName}</p>
          </div>

          <div className="card-actions">
            <button
              type="button"
              className="icon-button edit-button"
              onClick={() => setIsEditModalOpen(true)}
              title="Edit"
            >
              <img src={EditIcon} alt="Edit" className="icon-img" />
            </button>
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
          <span className="card-date">Order Date : {formatDate(subcontract.orderDate)}</span>
          {subcontract.subReturn?.returnDate && (
            <span className="card-date">Return Date : {formatDate(subcontract.subReturn.returnDate)}</span>
          )}
        </div>
      </div>

      <div className="card-body">
        <div className="material-section">
          <h4 className="section-title">{subcontract.itemName}</h4>

          <div className="stock-info">
            <div className="stock-item">
              <span className="stock-label">Sent</span>
              <div className="stock-values">
                <span className="stock-value">
                  {subcontract.sentStock} {subcontract.unit}
                </span>
                <span className="stock-pieces">
                  {(subcontract.sentStock * 25).toLocaleString('en-IN')} Pc.
                </span>
              </div>
            </div>

            <div className="stock-item">
              <span className="stock-label">Returned</span>
              <div className="stock-values">
                <span className="stock-value">
                  {returnStock.toFixed(3)} {subcontract.unit}
                </span>
                <span className="stock-pieces">
                  {(returnStock * 25).toFixed(2)} Pc.
                </span>
              </div>
            </div>

            <div className="stock-item">
              <span className="stock-label">Used</span>
              <div className="stock-values">
                <span className="stock-value">
                  {usedStock.toFixed(3)} {subcontract.unit}
                </span>
              </div>
            </div>

            <div className="stock-item">
              <span className="stock-label">Price/KG</span>
              <div className="stock-values">
                <span className="stock-value">₹{subcontract.price}</span>
                <span className="stock-total">Total : ₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="processes-section">
            <span className="processes-label">Processes</span>

            <div className="process-actions">
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as SubcontractingStatus)}
                className={`status-select-modern ${getStatusClass(status)}`}
                disabled={isUpdatingStatus}
                title="Update order status"
              >
                <option value={SubcontractingStatus.IN_PROCESS}>
                  {isUpdatingStatus ? 'Updating...' : 'In Process'}
                </option>
                <option value={SubcontractingStatus.COMPLETED}>Completed</option>
                <option value={SubcontractingStatus.REJECTED}>Rejected</option>
              </select>

              <button
                type="button"
                className="return-record-button"
                onClick={() => setIsReturnModalOpen(true)}
              >
                <img src={ReturnIcon} alt="Return" className="return-icon" />
                <span>Return Record</span>
              </button>
            </div>
          </div>

          {subcontract.remark && (
            <div className="remark-section">
              <span className="remark-label">Remark:</span>
              <p className="remark-text">{subcontract.remark}</p>
            </div>
          )}
        </div>
      </div>

      {isReturnModalOpen && (
        <ReturnRecordModal
          subcontract={subcontract}
          onClose={() => setIsReturnModalOpen(false)}
          onSubmit={handleReturnRecord}
        />
      )}

      {isEditModalOpen && (
        <AddSubcontractingModal
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={handleEdit}
          initialData={initialEditData}
        />
      )}
    </div>
  );
};

export default SubcontractingCard;
