import React, { useState } from 'react';
import { format } from 'date-fns';
import type { Subcontracting, SubReturnRequest, SubOrderRequest } from '../types';
import { SubcontractingStatus } from '../types';
import { subcontractingApi } from '../api/subcontracting';
import ReturnRecordModal from './ReturnRecordModal';
import AddSubcontractingModal from './AddSubcontractingModal';
import CromeModal from './CromeModal';
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
  const [isCromeModalOpen, setIsCromeModalOpen] = useState(false);
  const [status, setStatus] = useState(subcontract.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate Sent, Return, and Used values
  const subReturn = subcontract.subReturn;
  const grossReturn = subReturn?.returnStock || 0;

  // Calculate packaging deduction
  // Use packagingCount if available, fallback to returnElement, or 0
  const packagingCount = subReturn?.packagingCount || subReturn?.returnElement || 0;
  const packagingWeight = subReturn?.packagingWeight || 0;
  const packagingDeduction = packagingWeight * packagingCount;

  // Calculate Net Return
  // Use netReturnStock from backend if available, otherwise calculate
  const netReturn = subReturn?.netReturnStock ?? (grossReturn - packagingDeduction);

  // Round to 3 decimal places for consistent display/used calculation
  const netReturnRounded = Math.round(netReturn * 1000) / 1000;

  // Used Stock = Sent - Net Return
  // Use backend usedStock if available, otherwise calculate
  const usedStock = Math.round((subcontract.usedStock || (subcontract.sentStock - netReturnRounded)) * 1000) / 1000;

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
    contractorId: subcontract.contractor.contractorId,
    itemId: subcontract.item.subItemId,
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
            <p className="card-contractor">{subcontract.contractor.name}</p>
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
          <h4 className="section-title">{subcontract.item.name}</h4>

          <div className="crome-details-container">
            {/* SENT Details */}
            <div className="crome-detail-block">
              <div className="block-header">SENT DETAILS</div>
              <div className="detail-row">
                <span className="detail-label">Sent Stock</span>
                <span className="detail-value">{subcontract.sentStock.toFixed(3)} {subcontract.unit}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Total Pieces</span>
                <span className="detail-value">{(subcontract.sentStock * 25).toLocaleString('en-IN')} Pc</span>
              </div>
              <div className="detail-row total-row" style={{ marginTop: 'auto' }}>
                <span className="detail-label">Total Value</span>
                <div className="detail-value" style={{ textAlign: 'right' }}>
                  ₹{totalAmount.toLocaleString('en-IN')}
                  <span className="detail-sub-value">
                    (₹{subcontract.price}/unit + ₹{subcontract.jobWorkPay}/job)
                  </span>
                </div>
              </div>
            </div>

            {/* RETURN Details (if exists) */}
            {subcontract.subReturn ? (
              <div className="crome-detail-block return-block">
                <div className="block-header">RETURN DETAILS</div>
                <div className="detail-row">
                  <span className="detail-label">Gross Return</span>
                  <span className="detail-value">{grossReturn.toFixed(3)} {subcontract.unit}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Packaging</span>
                  <div className="detail-value">
                    {/* Calculate deduction using explicit weight calculation */}
                    {packagingDeduction.toFixed(3)} {subcontract.unit}
                    <span className="detail-sub-value">
                      ({packagingCount} x {packagingWeight} {subcontract.subReturn.packagingType})
                    </span>
                  </div>
                </div>
                <div className="detail-row total-row">
                  <span className="detail-label">Net Return</span>
                  <span className="detail-value">{netReturnRounded.toFixed(3)} {subcontract.unit}</span>
                </div>
                <div className="diff-section">
                  <span className="diff-label">USED STOCK</span>
                  <span className="diff-value neutral">
                    {usedStock.toFixed(3)} {subcontract.unit}
                  </span>
                </div>
              </div>
            ) : (
              <div className="crome-detail-block" style={{ justifyContent: 'center', alignItems: 'center', background: '#f8fafc', opacity: 0.6 }}>
                <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>Pending Return</span>
              </div>
            )}
          </div>

          {/* Crome Status Section */}
          <div style={{ padding: '0 4px 12px 4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#64748B' }}>
              <span>Crome Available: <strong style={{ color: '#0F172A' }}>{subcontract.availableStockForCrome?.toFixed(3) || '0.000'} {subcontract.unit}</strong></span>
              <span>Sent to Crome: <strong>{subcontract.cromeCount || 0}</strong></span>
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

              {!subcontract.subReturn && (
                <button
                  type="button"
                  className="return-record-button"
                  onClick={() => setIsReturnModalOpen(true)}
                >
                  <img src={ReturnIcon} alt="Return" className="return-icon" />
                  <span>Return Record</span>
                </button>
              )}

              <button
                type="button"
                className="crome-button"
                onClick={() => setIsCromeModalOpen(true)}
                disabled={!subcontract.canCreateCrome}
                title={subcontract.canCreateCrome ? 'Send to Crome' : 'No stock available for Crome'}
              >
                <span>Crome</span>
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

      {isCromeModalOpen && (
        <CromeModal
          subcontractingId={subcontract.subcontractingId}
          onClose={() => setIsCromeModalOpen(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};

export default SubcontractingCard;
