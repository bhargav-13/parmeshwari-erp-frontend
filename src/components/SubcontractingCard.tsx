import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import type { Crome, Subcontracting, SubReturnRequest, SubOrderRequest } from '../types';
import { SubcontractingStatus } from '../types';
import { subcontractingApi } from '../api/subcontracting';
import { cromeApi } from '../api/crome';
import ReturnRecordModal from './ReturnRecordModal';
import AddSubcontractingModal from './AddSubcontractingModal';
import CromeModal from './CromeModal';
import DeleteImpactDialog from './DeleteImpactDialog';
import EditIcon from '../assets/edit.svg';
import DeleteIcon from '../assets/delete.svg';
import ReturnIcon from '../assets/return.svg';
import './SubcontractingCard.css';
import '../styles/StatusDropdown.css';

interface SubcontractingCardProps {
  subcontract: Subcontracting;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
}

const SubcontractingCard: React.FC<SubcontractingCardProps> = ({ subcontract, onDelete, onRefresh }) => {
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [cromeReturnId, setCromeReturnId] = useState<number | null>(null);
  const [status, setStatus] = useState(subcontract.status);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  // Crome records grouped by the return chunk they were sent from.
  // A chunk with any Crome record hides its "Send to Crome" button.
  const [cromesByReturnId, setCromesByReturnId] = useState<Map<number, Crome[]>>(new Map());

  useEffect(() => {
    if (!subcontract.cromeCount) {
      setCromesByReturnId(new Map());
      return;
    }
    let cancelled = false;
    cromeApi
      .getCromesBySubcontractingId(subcontract.subcontractingId)
      .then(cromes => {
        if (cancelled) return;
        const grouped = new Map<number, Crome[]>();
        cromes.forEach(c => {
          if (c.subcontractingReturnId == null) return;
          const list = grouped.get(c.subcontractingReturnId) || [];
          list.push(c);
          grouped.set(c.subcontractingReturnId, list);
        });
        setCromesByReturnId(grouped);
      })
      .catch(err => console.error('Error fetching cromes:', err));
    return () => {
      cancelled = true;
    };
  }, [subcontract.subcontractingId, subcontract.cromeCount]);

  // Calculate Sent, Return, and Used values
  const subReturns = subcontract.subReturns || [];

  // Calculate Total Net Return
  // Use backend totalNetReturnStock OR sum of netReturnStock from items OR calculate
  const totalNetReturn = subcontract.totalNetReturnStock ?? subReturns.reduce((sum, r) => {
    if (r.netReturnStock != null) return sum + r.netReturnStock;
    const deduction = (r.packagings || []).reduce((d, p) => d + (p.packagingWeight || 0) * (p.packagingCount || 0), 0);
    return sum + (r.returnStock - deduction);
  }, 0);

  // Round to 3 decimal places
  const totalNetReturnRounded = Math.round(totalNetReturn * 1000) / 1000;

  // Used Stock = Sent - Total Net Return
  // User requested to force frontend calculation to ensure match with displayed Net Return
  const usedStock = Math.round((subcontract.sentStock - totalNetReturnRounded) * 1000) / 1000;

  const totalAmount = subcontract.totalAmount || 0;

  const sentToCromeCount = subReturns.filter(r => r.returnId != null && cromesByReturnId.has(r.returnId)).length;
  const totalSentToCrome = Array.from(cromesByReturnId.values())
    .flat()
    .reduce((sum, c) => sum + (c.sentStock || 0), 0);
  const returnedPercent = subcontract.sentStock > 0
    ? Math.min(100, (totalNetReturnRounded / subcontract.sentStock) * 100)
    : 0;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd-MM-yyyy');
  };

  const formatQty = (value: number) => value.toFixed(3);

  const formatMoney = (value: number) =>
    value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const handleDelete = () => setIsDeleteDialogOpen(true);

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
              title="Delete"
            >
              <img src={DeleteIcon} alt="Delete" className="icon-img" />
            </button>
          </div>
        </div>

        <div className="card-dates">
          <span className="card-date">Order Date : {formatDate(subcontract.orderDate)}</span>
          {subReturns.length > 0 && (
            <span className="card-date">Last Return : {formatDate(subReturns[subReturns.length - 1].returnDate)}</span>
          )}
        </div>
      </div>

      <div className="card-body">
        <div className="material-section">
          <h4 className="section-title">{subcontract.item.name}</h4>

          {/* Summary strip */}
          <div className="sc-summary">
            <div className="sc-stat">
              <span className="sc-stat-label">Sent</span>
              <span className="sc-stat-value">{formatQty(subcontract.sentStock)} <small>{subcontract.unit}</small></span>
            </div>
            <div className="sc-stat">
              <span className="sc-stat-label">Net Returned</span>
              <span className="sc-stat-value sc-green">{formatQty(totalNetReturnRounded)} <small>{subcontract.unit}</small></span>
            </div>
            <div className="sc-stat">
              <span className="sc-stat-label">Used Stock</span>
              <span className="sc-stat-value">{formatQty(usedStock)} <small>{subcontract.unit}</small></span>
            </div>
            <div className="sc-stat">
              <span className="sc-stat-label">In Crome</span>
              <span className="sc-stat-value sc-purple">
                {sentToCromeCount}/{subReturns.length} <small>chunks</small>
              </span>
              {totalSentToCrome > 0 && (
                <span className="sc-stat-sub">{formatQty(totalSentToCrome)} {subcontract.unit}</span>
              )}
            </div>
            <div className="sc-progress" title={`${returnedPercent.toFixed(1)}% returned`}>
              <div className="sc-progress-fill" style={{ width: `${returnedPercent}%` }} />
            </div>
          </div>

          <div className="crome-details-container sc-details">
            {/* SENT Details */}
            <div className="crome-detail-block sc-sent-block">
              <div className="block-header">Sent Details</div>
              <div className="detail-row">
                <span className="detail-label">Sent Stock</span>
                <span className="detail-value">{formatQty(subcontract.sentStock)} {subcontract.unit}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Total Pieces</span>
                <span className="detail-value">{(subcontract.sentStock * 25).toLocaleString('en-IN')} Pc</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Rate</span>
                <span className="detail-value">₹{formatMoney(subcontract.price)} / {subcontract.unit}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Job Work</span>
                <span className="detail-value">₹{formatMoney(subcontract.jobWorkPay)} / {subcontract.unit}</span>
              </div>
              <div className="detail-row total-row">
                <span className="detail-label">Total Value</span>
                <span className="detail-value">₹{formatMoney(totalAmount)}</span>
              </div>
            </div>

            {/* RETURN Details (List) */}
            {subReturns.length > 0 ? (
              <div className="crome-detail-block return-block">
                <button
                  type="button"
                  className="sc-return-header"
                  onClick={() => setIsExpanded(!isExpanded)}
                  aria-expanded={isExpanded}
                >
                  <span className="sc-return-title">Return Details ({subReturns.length})</span>
                  <span className="sc-expand-toggle">
                    {isExpanded ? 'Collapse' : 'Expand'}
                    <span className={`sc-chevron ${isExpanded ? 'expanded' : ''}`}>▾</span>
                  </span>
                </button>

                {isExpanded && (
                  <div className="sc-return-list">
                    {subReturns.map((ret, index) => {
                      const retDeduction = (ret.packagings || []).reduce((d, p) => d + (p.packagingWeight || 0) * (p.packagingCount || 0), 0);
                      const retNet = ret.netReturnStock ?? (ret.returnStock - retDeduction);
                      const pkgDisplay = (ret.packagings || []).map(p => `${p.packagingCount} ${p.packagingType}`).join(', ') || '-';
                      const retCromes = ret.returnId != null ? cromesByReturnId.get(ret.returnId) : undefined;
                      const retCromeSent = (retCromes || []).reduce((sum, c) => sum + (c.sentStock || 0), 0);
                      const retCromeReturned = !!retCromes && retCromes.every(c => c.cromeReturn);
                      return (
                        <div key={ret.returnId ?? index} className="sc-return-row">
                          <div className="sc-return-main">
                            <div className="detail-row">
                              <span className="sc-return-date">{formatDate(ret.returnDate)}</span>
                              <span className="detail-value">{formatQty(ret.returnStock)} {subcontract.unit} <span className="sc-muted">(Gr)</span></span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Pkg: {pkgDisplay}</span>
                              <span className="detail-value">Net: {formatQty(retNet)}</span>
                            </div>
                          </div>
                          <div className="sc-return-crome">
                            {retCromes ? (
                              <span
                                className={`sc-crome-chip ${retCromeReturned ? 'returned' : 'in-crome'}`}
                                title={retCromes.map(c => `${formatDate(c.cromeDate)} · ${c.partyName}`).join('\n')}
                              >
                                {retCromeReturned ? 'Crome Returned' : 'In Crome'} · {formatQty(retCromeSent)} {subcontract.unit}
                              </span>
                            ) : ret.returnId != null && (
                              <button
                                type="button"
                                className="sc-send-crome-btn"
                                onClick={() => setCromeReturnId(ret.returnId!)}
                              >
                                Send to Crome
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="detail-row total-row sc-return-total">
                  <span className="detail-label">Total Net Return</span>
                  <span className="detail-value">{formatQty(totalNetReturnRounded)} {subcontract.unit}</span>
                </div>
              </div>
            ) : (
              <div className="crome-detail-block pending-block">
                <span className="pending-text">Pending Return</span>
              </div>
            )}
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

              {subcontract.status === SubcontractingStatus.IN_PROCESS && (
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

      {isDeleteDialogOpen && (
        <DeleteImpactDialog
          title="Delete Job Work"
          subject={`job work PBI-${subcontract.subcontractingId}`}
          loadImpact={() => subcontractingApi.getDeleteImpact(subcontract.subcontractingId)}
          onConfirm={() => onDelete(subcontract.subcontractingId)}
          onClose={() => setIsDeleteDialogOpen(false)}
        />
      )}

      {cromeReturnId !== null && (
        <CromeModal
          subcontractingId={subcontract.subcontractingId}
          subcontractingReturnId={cromeReturnId}
          onClose={() => setCromeReturnId(null)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
};

export default SubcontractingCard;
