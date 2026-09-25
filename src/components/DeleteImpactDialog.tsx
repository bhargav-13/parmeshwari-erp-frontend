import React, { useEffect, useState } from 'react';
import type { DeleteImpact } from '../types';
import { formatQty } from '../utils/format';
import './DeleteImpactDialog.css';

interface DeleteImpactDialogProps {
  title: string;
  /** What is being deleted, e.g. "job work PBI-5" */
  subject: string;
  /** True when the subject itself is the (single) crome record, so it isn't counted twice */
  subjectIsCrome?: boolean;
  loadImpact: () => Promise<DeleteImpact>;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const floorLabel = (floor?: string | null) =>
  floor === 'GROUND_FLOOR' ? 'Ground Floor' : floor === 'FIRST_FLOOR' ? 'First Floor' : '—';

const errorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message || err?.message || fallback;

/**
 * Confirms a delete after showing exactly what it will remove: crome records and the stock
 * their returns added to inventory. Delete is disabled when that stock has already been used.
 */
const DeleteImpactDialog: React.FC<DeleteImpactDialogProps> = ({ title, subject, subjectIsCrome = false, loadImpact, onConfirm, onClose }) => {
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImpact()
      .then(data => { if (!cancelled) setImpact(data); })
      .catch(err => { if (!cancelled) setError(errorMessage(err, 'Failed to check what will be deleted')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async () => {
    try {
      setDeleting(true);
      setError(null);
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(errorMessage(err, 'Failed to delete'));
      setDeleting(false);
    }
  };

  const canDelete = !!impact && impact.canDelete;

  return (
    <div className="delete-impact-overlay" onClick={onClose}>
      <div className="delete-impact-dialog" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="delete-impact-title">{title}</h2>

        {loading ? (
          <p className="delete-impact-text">Checking what will be removed…</p>
        ) : impact ? (
          <>
            <p className="delete-impact-text">
              This will permanently delete <strong>{subject}</strong>
              {subjectIsCrome && impact.cromeReturnCount > 0 && ' and its return'}
              {!subjectIsCrome && impact.cromeCount > 0 && (
                <>
                  {' '}and <strong>{impact.cromeCount} crome record{impact.cromeCount === 1 ? '' : 's'}</strong>
                  {impact.cromeReturnCount > 0 && ` (${impact.cromeReturnCount} with a return)`}
                </>
              )}
              .
            </p>

            {impact.stockReversals.length > 0 && (
              <div className="delete-impact-section">
                <div className="delete-impact-section-title">Stock that will be removed from inventory</div>
                <table className="delete-impact-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Floor</th>
                      <th>Remove</th>
                      <th>In stock now</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impact.stockReversals.map((line, i) => (
                      <tr key={i} className={line.sufficient ? '' : 'insufficient'}>
                        <td>{line.itemName}</td>
                        <td>{floorLabel(line.floor)}</td>
                        <td>
                          {formatQty(line.quantityKg)} kg
                          {!!line.quantityPc && line.quantityPc > 0 && (
                            <span className="delete-impact-sub"> / {line.quantityPc.toLocaleString('en-IN')} pcs</span>
                          )}
                        </td>
                        <td>{formatQty(line.currentKg)} kg</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {impact.untrackedCromeReturnCount > 0 && (
              <div className="delete-impact-warning">
                {impact.untrackedCromeReturnCount} crome return{impact.untrackedCromeReturnCount === 1 ? ' was' : 's were'} recorded
                before stock tracking started. Any stock they added will <strong>not</strong> be removed automatically —
                adjust inventory manually if needed.
              </div>
            )}

            {!impact.canDelete && impact.blockReason && (
              <div className="delete-impact-error">
                Can't delete: {impact.blockReason}. Bring the stock back (or delete the sale/rejection that used it) first.
              </div>
            )}
          </>
        ) : null}

        {error && <div className="delete-impact-error">{error}</div>}

        <div className="delete-impact-actions">
          <button type="button" className="delete-impact-cancel" onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button
            type="button"
            className="delete-impact-confirm"
            onClick={handleConfirm}
            disabled={!canDelete || deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteImpactDialog;
