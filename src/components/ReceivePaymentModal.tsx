import React, { useMemo, useState } from 'react';
import DateInput from './DateInput';
import { accountsApi, errorMessage } from '../api/accounts';
import { formatDate, formatMoney, roundMoney, todayLocal } from '../utils/format';
import type { BillingType, PartyAccount, PaymentFloor, PaymentReceipt } from '../types';
import './ReceivePaymentModal.css';

interface ReceivePaymentModalProps {
  account: PartyAccount;
  /** The floor being worked on; floor staff always record on their own */
  floor?: PaymentFloor | '';
  /** Mode to start on; otherwise the first one with something due */
  initialMode?: BillingType;
  onClose: () => void;
  onSaved: (receipt: PaymentReceipt) => void;
}

/** Something a payment can pay: the opening balance (no order) or one order. */
interface OpenDue {
  key: string;
  orderId: number | null;
  label: string;
  date?: string;
  due: number;
}

const modeKey = (mode: BillingType) => (mode === 'OFFICIAL' ? 'official' : 'offline');

/** What can be paid in a mode, oldest first: the opening balance, then each order. */
const openDues = (account: PartyAccount, mode: BillingType): OpenDue[] => {
  const side = modeKey(mode);
  const dues: OpenDue[] = [];
  const openingDue = account.summary[side].openingDue;
  if (openingDue > 0.004) {
    dues.push({ key: 'opening', orderId: null, label: 'Opening balance', due: openingDue });
  }
  [...account.orders]
    .sort((a, b) => (a.orderDate || '').localeCompare(b.orderDate || '') || a.orderId - b.orderId)
    .forEach((order) => {
      const due = order[side]?.due ?? 0;
      if (due > 0.004) {
        dues.push({ key: `order-${order.orderId}`, orderId: order.orderId, label: `Order #${order.orderId}`, date: order.orderDate, due });
      }
    });
  return dues;
};

/** The amount spread over the dues, oldest first. */
const oldestFirst = (dues: OpenDue[], amount: number): Record<string, string> => {
  const split: Record<string, string> = {};
  let left = roundMoney(amount);
  for (const due of dues) {
    if (left <= 0) break;
    const paid = roundMoney(Math.min(left, due.due));
    split[due.key] = String(paid);
    left = roundMoney(left - paid);
  }
  return split;
};

const ReceivePaymentModal: React.FC<ReceivePaymentModalProps> = ({ account, floor, initialMode, onClose, onSaved }) => {
  const firstDueMode: BillingType =
    initialMode ?? (account.summary.official.due > 0 || account.summary.offline.due <= 0 ? 'OFFICIAL' : 'OFFLINE');
  const [mode, setMode] = useState<BillingType>(firstDueMode);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayLocal());
  const [note, setNote] = useState('');
  // Null while the split follows the amount (oldest first); set once the user changes a line
  const [manualSplit, setManualSplit] = useState<Record<string, string> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dues = useMemo(() => openDues(account, mode), [account, mode]);
  const maxPayable = roundMoney(dues.reduce((sum, d) => sum + d.due, 0));
  const amountValue = roundMoney(Number(amount) || 0);
  const split = manualSplit ?? oldestFirst(dues, amountValue);
  const applied = roundMoney(dues.reduce((sum, d) => sum + (Number(split[d.key]) || 0), 0));
  const unapplied = roundMoney(amountValue - applied);

  const lineError = (due: OpenDue): string | null => {
    const value = Number(split[due.key]) || 0;
    if (value < 0) return 'Cannot be negative';
    if (value > due.due + 0.004) return `Only ${formatMoney(due.due)} due`;
    return null;
  };
  const anyLineError = dues.some((d) => lineError(d) !== null);

  const problem =
    amountValue <= 0
      ? null
      : amountValue > maxPayable + 0.004
        ? `Only ${formatMoney(maxPayable)} is due on ${mode === 'OFFICIAL' ? 'Official' : 'Offline'}.`
        : anyLineError
          ? 'Fix the amounts marked below.'
          : Math.abs(unapplied) > 0.004
            ? unapplied > 0
              ? `${formatMoney(unapplied)} is not applied to anything yet.`
              : `The lines add up to ${formatMoney(-unapplied)} more than the payment.`
            : null;
  const canSave = amountValue > 0 && !problem && !!date && !saving;

  const switchMode = (next: BillingType) => {
    setMode(next);
    setManualSplit(null);
    setError(null);
  };

  const setLine = (key: string, value: string) => {
    setManualSplit({ ...split, [key]: value });
    setError(null);
  };

  const toggleLine = (due: OpenDue, on: boolean) => {
    if (!on) {
      setLine(due.key, '');
      return;
    }
    // Ticking a line gives it what is left of the payment, up to its due
    const left = Math.max(0, roundMoney(amountValue - applied));
    setLine(due.key, String(roundMoney(Math.min(due.due, left || due.due))));
  };

  const save = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      setError(null);
      const receipt = await accountsApi.recordReceipt(account.summary.partyId, {
        mode,
        amount: amountValue,
        receivedDate: date,
        note: note.trim() || undefined,
        floor: floor || undefined,
        allocations: dues
          .filter((d) => (Number(split[d.key]) || 0) > 0)
          .map((d) => ({ orderId: d.orderId, amount: roundMoney(Number(split[d.key])) })),
      });
      onSaved(receipt);
    } catch (err) {
      setError(errorMessage(err, 'Could not save the payment. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const sideDue = (m: BillingType) => account.summary[modeKey(m)].due;

  return (
    <div className="modal-overlay receive-modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal-content receive-modal" onClick={(e) => e.stopPropagation()}>
        <div className="receive-modal-header">
          <div>
            <p className="receive-modal-eyebrow">Receive payment</p>
            <h2 className="modal-title">{account.summary.partyName}</h2>
          </div>
          <button type="button" className="receive-modal-close" onClick={onClose} aria-label="Close" disabled={saving}>✕</button>
        </div>

        <div className="receive-mode" role="radiogroup" aria-label="Paid against">
          {(['OFFICIAL', 'OFFLINE'] as BillingType[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mode === m}
              className={`receive-mode-option${mode === m ? ' active' : ''}`}
              onClick={() => switchMode(m)}
              disabled={sideDue(m) <= 0}
            >
              <span className="receive-mode-label">{m === 'OFFICIAL' ? 'Official' : 'Offline'}</span>
              <span className="receive-mode-due">{sideDue(m) > 0 ? `${formatMoney(sideDue(m))} due` : 'Nothing due'}</span>
            </button>
          ))}
        </div>

        <div className="form-row">
          <div className="form-group receive-amount-group">
            <label className="form-label" htmlFor="receive-amount">Amount received*</label>
            <div className="receive-amount-input">
              <span>₹</span>
              <input
                id="receive-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="0"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setManualSplit(null); setError(null); }}
                autoFocus
              />
            </div>
            {maxPayable > 0 && (
              <button
                type="button"
                className="receive-full-due"
                onClick={() => { setAmount(String(maxPayable)); setManualSplit(null); }}
              >
                Full due {formatMoney(maxPayable)}
              </button>
            )}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="receive-date">Date received*</label>
            <DateInput
              id="receive-date"
              className="form-input"
              value={date}
              max={todayLocal()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="receive-note">Note</label>
          <input
            id="receive-note"
            className="form-input"
            maxLength={255}
            placeholder="Cash, UPI, cheque no., bank…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="receive-split">
          <div className="receive-split-header">
            <span className="form-label">This payment clears</span>
            {manualSplit ? (
              <button type="button" className="receive-link" onClick={() => setManualSplit(null)}>Reset to oldest first</button>
            ) : (
              <span className="receive-split-hint">Oldest first. Untick or change a line to choose.</span>
            )}
          </div>
          {dues.length === 0 ? (
            <p className="receive-split-empty">Nothing is due on {mode === 'OFFICIAL' ? 'Official' : 'Offline'}.</p>
          ) : (
            <ul className="receive-split-list">
              {dues.map((due) => {
                const value = split[due.key] ?? '';
                const on = (Number(value) || 0) > 0;
                const issue = lineError(due);
                return (
                  <li key={due.key} className={`receive-split-line${on ? ' on' : ''}`}>
                    <label className="receive-split-check">
                      <input type="checkbox" checked={on} onChange={(e) => toggleLine(due, e.target.checked)} />
                      <span>
                        <span>
                          <strong>{due.label}</strong>
                          {due.date && <span className="receive-split-date"> · {formatDate(due.date)}</span>}
                        </span>
                        <span className="receive-split-due">{formatMoney(due.due)} due</span>
                      </span>
                    </label>
                    <div className="receive-split-amount">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={`form-input${issue ? ' input-error' : ''}`}
                        value={value}
                        placeholder="0"
                        aria-label={`Amount for ${due.label}`}
                        onChange={(e) => setLine(due.key, e.target.value)}
                      />
                      {issue && <span className="receive-line-error">{issue}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {amountValue > 0 && (
            <div className={`receive-split-total${problem ? ' bad' : ''}`}>
              {problem ?? `All ${formatMoney(amountValue)} applied. ${mode === 'OFFICIAL' ? 'Official' : 'Offline'} due after this: ${formatMoney(sideDue(mode) - amountValue)}`}
            </div>
          )}
        </div>

        {error && <div className="receive-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="save-button" onClick={save} disabled={!canSave}>
            {saving ? 'Saving…' : amountValue > 0 ? `Record ${formatMoney(amountValue)}` : 'Record payment'}
          </button>
          <button type="button" className="cancel-button" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default ReceivePaymentModal;
