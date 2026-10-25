import React, { useState } from 'react';
import DateInput from './DateInput';
import { accountsApi, errorMessage } from '../api/accounts';
import { getUserFloor } from '../lib/auth';
import { todayLocal } from '../utils/format';
import type { PaymentFloor } from '../types';
import './StatementDownloadModal.css';

interface StatementDownloadModalProps {
  /** One party's statement; left out, a statement of every party */
  party?: { partyId: number; name: string };
  /** The floor the statement starts on (the page's floor); Admin and Owner can change it */
  floor?: PaymentFloor | '';
  onClose: () => void;
}

type Range = 'all' | 'thisMonth' | 'lastMonth' | 'financialYear' | 'custom';

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Start and end of a quick range; a blank start means from the beginning. */
const rangeDates = (range: Range): { start: string; end: string } => {
  const today = new Date();
  switch (range) {
    case 'thisMonth':
      return { start: iso(new Date(today.getFullYear(), today.getMonth(), 1)), end: iso(today) };
    case 'lastMonth':
      return {
        start: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        end: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
      };
    case 'financialYear': {
      // Indian financial year: 1 April to 31 March
      const startYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      return { start: `${startYear}-04-01`, end: iso(today) };
    }
    default:
      return { start: '', end: iso(today) };
  }
};

const RANGES: { key: Range; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'thisMonth', label: 'This month' },
  { key: 'lastMonth', label: 'Last month' },
  { key: 'financialYear', label: 'This financial year' },
  { key: 'custom', label: 'Custom' },
];

const StatementDownloadModal: React.FC<StatementDownloadModalProps> = ({ party, floor = '', onClose }) => {
  const [range, setRange] = useState<Range>('all');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState(todayLocal());
  const [statementFloor, setStatementFloor] = useState<PaymentFloor | ''>(floor);
  const [onlyDue, setOnlyDue] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const floorUser = getUserFloor() !== null;

  const pickRange = (next: Range) => {
    setRange(next);
    if (next !== 'custom') {
      const dates = rangeDates(next);
      setStart(dates.start);
      setEnd(dates.end);
    }
  };

  const download = async () => {
    if (start && end && start > end) {
      setError('The start date is after the end date.');
      return;
    }
    try {
      setDownloading(true);
      setError(null);
      const period = { startDate: start, endDate: end };
      if (party) {
        await accountsApi.downloadPartyStatement(party.partyId, party.name, period, todayLocal(), statementFloor);
      } else {
        await accountsApi.downloadAllStatements(period, todayLocal(), statementFloor, onlyDue);
      }
      onClose();
    } catch (err) {
      setError(errorMessage(err, 'Could not make the statement. Please try again.'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="modal-overlay statement-modal-overlay" onClick={onClose}>
      <div className="modal-content small-modal statement-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{party ? 'Download statement' : 'Download all statements'}</h2>
        <p className="statement-modal-subtitle">
          {party
            ? <>Account of <strong>{party.name}</strong>: opening balance, every bill and payment, and the balance due.</>
            : 'One PDF: a summary of every party, then each party’s full account.'}
        </p>

        <div className="statement-ranges" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`filter-chip${range === r.key ? ' active' : ''}`}
              onClick={() => pickRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="form-row statement-dates">
          <div className="form-group">
            <label className="form-label" htmlFor="statement-start">From</label>
            <DateInput
              id="statement-start"
              className="form-input"
              value={start}
              max={end || undefined}
              placeholder="Beginning"
              onChange={(e) => { setStart(e.target.value); setRange('custom'); }}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="statement-end">To</label>
            <DateInput
              id="statement-end"
              className="form-input"
              value={end}
              min={start || undefined}
              max={todayLocal()}
              onChange={(e) => { setEnd(e.target.value); setRange('custom'); }}
            />
          </div>
        </div>

        {!floorUser && (
          <div className="form-group">
            <label className="form-label" htmlFor="statement-floor">Floor</label>
            <select
              id="statement-floor"
              className="form-input"
              value={statementFloor}
              onChange={(e) => setStatementFloor(e.target.value as PaymentFloor | '')}
            >
              <option value="">Both floors</option>
              <option value="GROUND_FLOOR">Ground Floor</option>
              <option value="FIRST_FLOOR">First Floor</option>
            </select>
          </div>
        )}

        {!party && (
          <label className="statement-only-due">
            <input type="checkbox" checked={onlyDue} onChange={(e) => setOnlyDue(e.target.checked)} />
            Only parties with a balance due
          </label>
        )}

        {error && <div className="statement-error">{error}</div>}

        <div className="modal-actions">
          <button type="button" className="save-button" onClick={download} disabled={downloading}>
            {downloading ? 'Preparing PDF…' : 'Download PDF'}
          </button>
          <button type="button" className="cancel-button" onClick={onClose} disabled={downloading}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatementDownloadModal;
