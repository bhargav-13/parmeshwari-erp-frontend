import React, { useState, useEffect } from 'react';
import type { RejectionRequest, RejectionResponse, RejectionReturnType, StockItem } from '../types';
import { RejectionReturnType as ReturnTypeEnum } from '../types';
import { getRejectionPartyOptions, rejectionPartyKey, type RejectionPartyOption } from '../api/rejection';
import { stockItemApi } from '../api/inventory';
import './AddRejectionModal.css';

interface AddRejectionModalProps {
  onClose: () => void;
  onSubmit: (data: RejectionRequest) => Promise<void>;
  initialData?: RejectionResponse | null;
}

const emptyForm = (): RejectionRequest => ({
  partyId: 0,
  partyType: 'PURCHASE',
  date: new Date().toISOString().split('T')[0],
  weight: 0,
  returnType: ReturnTypeEnum.CASH,
  amount: undefined,
  stockItemId: undefined,
  returnQty: undefined,
});

const AddRejectionModal: React.FC<AddRejectionModalProps> = ({
  onClose,
  onSubmit,
  initialData,
}) => {
  const [form, setForm] = useState<RejectionRequest>(() => {
    if (initialData) {
      return {
        partyId: initialData.party?.id ?? 0,
        partyType: initialData.partyType ?? 'PURCHASE',
        date: initialData.date,
        weight: initialData.weight,
        returnType: initialData.returnType,
        amount: initialData.amount,
        stockItemId: initialData.stockItem?.stockItemId,
        returnQty: initialData.returnQty,
      };
    }
    return emptyForm();
  });

  const [parties, setParties] = useState<RejectionPartyOption[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loadingParties, setLoadingParties] = useState(true);
  const [loadingStock, setLoadingStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getRejectionPartyOptions()
      .then(setParties)
      .catch(() => setError('Failed to load parties'))
      .finally(() => setLoadingParties(false));
  }, []);

  useEffect(() => {
    if (form.returnType === ReturnTypeEnum.MAAL) {
      setLoadingStock(true);
      stockItemApi
        .getAllStockItems()
        .then(setStockItems)
        .catch(() => setError('Failed to load stock items'))
        .finally(() => setLoadingStock(false));
    }
  }, [form.returnType]);

  const set = <K extends keyof RejectionRequest>(key: K, value: RejectionRequest[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleReturnTypeChange = (rt: RejectionReturnType) => {
    setForm(prev => ({
      ...prev,
      returnType: rt,
      amount: undefined,
      stockItemId: undefined,
      returnQty: undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.partyId) { setError('Please select a party.'); return; }
    if (!form.date) { setError('Please select a date.'); return; }
    if (!form.weight || form.weight <= 0) { setError('Please enter a valid weight.'); return; }
    if (form.returnType === ReturnTypeEnum.CASH) {
      if (!form.amount || form.amount <= 0) { setError('Please enter a cash amount.'); return; }
    } else {
      if (!form.stockItemId) { setError('Please select a stock item.'); return; }
      if (!form.returnQty || form.returnQty <= 0) { setError('Please enter a return quantity.'); return; }
    }

    try {
      setSubmitting(true);
      const payload: RejectionRequest = {
        partyId: form.partyId,
        partyType: form.partyType,
        date: form.date,
        weight: form.weight,
        returnType: form.returnType,
        ...(form.returnType === ReturnTypeEnum.CASH
          ? { amount: form.amount }
          : { stockItemId: form.stockItemId, returnQty: form.returnQty }),
      };
      await onSubmit(payload);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save rejection entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="rejection-modal-content" onClick={e => e.stopPropagation()}>
        <h2 className="rejection-modal-title">
          {initialData ? 'Edit Rejection Entry' : 'Add Rejection Entry'}
        </h2>

        <form className="rejection-modal-form" onSubmit={handleSubmit}>
          {/* Party */}
          <div className="rejection-form-group">
            <label className="rejection-form-label" htmlFor="rejection-party">
              Party <span className="required-star">*</span>
            </label>
            {loadingParties ? (
              <div className="rejection-loading-text">Loading parties…</div>
            ) : (
              <select
                id="rejection-party"
                className="rejection-form-select"
                value={form.partyId ? rejectionPartyKey(form.partyType, form.partyId) : ''}
                onChange={e => {
                  const opt = parties.find(p => p.key === e.target.value);
                  setForm(prev => ({
                    ...prev,
                    partyId: opt?.id ?? 0,
                    partyType: opt?.partyType ?? 'PURCHASE',
                  }));
                }}
                title="Select Party"
              >
                <option value="">Select a party</option>
                {(['PURCHASE', 'SALES'] as const).map(type => {
                  const group = parties.filter(p => p.partyType === type);
                  if (group.length === 0) return null;
                  return (
                    <optgroup key={type} label={type === 'PURCHASE' ? 'Purchase Parties' : 'Sales Parties'}>
                      {group.map(p => (
                        <option key={p.key} value={p.key}>
                          {p.name} ({type === 'PURCHASE' ? 'Purchase' : 'Sales'})
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            )}
            {!loadingParties && parties.length === 0 && (
              <div className="rejection-loading-text">
                No parties found. Add one in Party Master (Purchase or Sales).
              </div>
            )}
          </div>

          {/* Date & Weight row */}
          <div className="rejection-form-row">
            <div className="rejection-form-group">
              <label className="rejection-form-label" htmlFor="rejection-date">
                Date <span className="required-star">*</span>
              </label>
              <input
                id="rejection-date"
                type="date"
                className="rejection-form-input"
                value={form.date}
                onChange={e => set('date', e.target.value)}
                title="Date"
              />
            </div>
            <div className="rejection-form-group">
              <label className="rejection-form-label" htmlFor="rejection-weight">
                Weight (kg) <span className="required-star">*</span>
              </label>
              <input
                id="rejection-weight"
                type="number"
                className="rejection-form-input"
                value={form.weight || ''}
                onChange={e => set('weight', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                min="0"
                step="0.001"
                title="Weight"
              />
            </div>
          </div>

          {/* Return Type */}
          <div className="rejection-form-group">
            <label className="rejection-form-label">
              Return Type <span className="required-star">*</span>
            </label>
            <div className="rejection-radio-group">
              <label className={`rejection-radio-option ${form.returnType === ReturnTypeEnum.CASH ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="returnType"
                  value={ReturnTypeEnum.CASH}
                  checked={form.returnType === ReturnTypeEnum.CASH}
                  onChange={() => handleReturnTypeChange(ReturnTypeEnum.CASH)}
                />
                <span className="rejection-radio-label">Cash</span>
              </label>
              <label className={`rejection-radio-option ${form.returnType === ReturnTypeEnum.MAAL ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="returnType"
                  value={ReturnTypeEnum.MAAL}
                  checked={form.returnType === ReturnTypeEnum.MAAL}
                  onChange={() => handleReturnTypeChange(ReturnTypeEnum.MAAL)}
                />
                <span className="rejection-radio-label">Maal</span>
              </label>
            </div>
          </div>

          {/* Conditional: CASH → amount */}
          {form.returnType === ReturnTypeEnum.CASH && (
            <div className="rejection-form-group">
              <label className="rejection-form-label" htmlFor="rejection-amount">
                Amount (₹) <span className="required-star">*</span>
              </label>
              <input
                id="rejection-amount"
                type="number"
                className="rejection-form-input"
                value={form.amount || ''}
                onChange={e => set('amount', parseFloat(e.target.value) || undefined)}
                placeholder="0.00"
                min="0"
                step="0.01"
                title="Cash Amount"
              />
            </div>
          )}

          {/* Conditional: MAAL → stock item + returnQty */}
          {form.returnType === ReturnTypeEnum.MAAL && (
            <div className="rejection-form-row">
              <div className="rejection-form-group">
                <label className="rejection-form-label" htmlFor="rejection-stock-item">
                  Stock Item <span className="required-star">*</span>
                </label>
                {loadingStock ? (
                  <div className="rejection-loading-text">Loading stock items…</div>
                ) : (
                  <select
                    id="rejection-stock-item"
                    className="rejection-form-select"
                    value={form.stockItemId || ''}
                    onChange={e => set('stockItemId', Number(e.target.value) || undefined)}
                    title="Stock Item"
                  >
                    <option value="">Select stock item</option>
                    {stockItems.map(s => (
                      <option key={s.stockItemId} value={s.stockItemId}>
                        {s.product.productName} — {s.quantityInKg.toFixed(2)} kg
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="rejection-form-group">
                <label className="rejection-form-label" htmlFor="rejection-return-qty">
                  Return Qty (kg) <span className="required-star">*</span>
                </label>
                <input
                  id="rejection-return-qty"
                  type="number"
                  className="rejection-form-input"
                  value={form.returnQty || ''}
                  onChange={e => set('returnQty', parseFloat(e.target.value) || undefined)}
                  placeholder="0.00"
                  min="0"
                  step="0.001"
                  title="Return Quantity"
                />
              </div>
            </div>
          )}

          {error && <div className="rejection-error">{error}</div>}

          <div className="rejection-modal-actions">
            <button
              type="submit"
              className="rejection-save-btn"
              disabled={submitting || loadingParties}
            >
              {submitting ? 'Saving…' : initialData ? 'Update' : 'Add Entry'}
            </button>
            <button
              type="button"
              className="rejection-cancel-btn"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRejectionModal;
