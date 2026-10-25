import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { accountsApi, errorMessage } from '../api/accounts';
import type { PartyAccountSummary, PaymentFloor } from '../types';
import { formatDate, formatMoney } from '../utils/format';
import PartyAccountPanel from '../components/PartyAccountPanel';
import StatementDownloadModal from '../components/StatementDownloadModal';
import Loading from '../components/Loading';
import SearchIcon from '../assets/search.svg';
import './PaymentReminderPage.css';

interface PaymentReminderPageProps {
  floor: PaymentFloor;
}

type Show = 'due' | 'all' | 'settled';
type Sort = 'due' | 'name' | 'oldestPayment';

const sum = (rows: PartyAccountSummary[], pick: (r: PartyAccountSummary) => number) =>
  rows.reduce((total, r) => total + pick(r), 0);

/** Days since the party last paid, or null when it never has. */
const daysSince = (date?: string | null) => {
  if (!date) return null;
  const [y, m, d] = date.split('-').map(Number);
  const then = new Date(y, m - 1, d).getTime();
  const today = new Date();
  return Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - then) / 86400000);
};

const PaymentReminderPage: React.FC<PaymentReminderPageProps> = ({ floor }) => {
  const [rows, setRows] = useState<PartyAccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [show, setShow] = useState<Show>('due');
  const [sort, setSort] = useState<Sort>('due');
  const [openParty, setOpenParty] = useState<{ partyId: number; name: string; receive: boolean } | null>(null);
  const [allStatementsOpen, setAllStatementsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      setRows(await accountsApi.getAccounts(floor));
    } catch (err) {
      setError(errorMessage(err, 'Could not load party balances. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [floor]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const monthLabel = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (q && !r.partyName.toLowerCase().includes(q)) return false;
      if (show === 'due') return r.totalDue > 0.004;
      if (show === 'settled') return r.totalDue <= 0.004;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.partyName.localeCompare(b.partyName);
      if (sort === 'oldestPayment') {
        // Never paid first, then the longest since the last payment
        const da = daysSince(a.lastPaymentDate) ?? Number.MAX_SAFE_INTEGER;
        const db = daysSince(b.lastPaymentDate) ?? Number.MAX_SAFE_INTEGER;
        return db - da || b.totalDue - a.totalDue;
      }
      return b.totalDue - a.totalDue || a.partyName.localeCompare(b.partyName);
    });
  }, [rows, search, show, sort]);

  const totals = {
    official: sum(rows, (r) => Math.max(0, r.official.due)),
    offline: sum(rows, (r) => Math.max(0, r.offline.due)),
    aaglu: sum(rows, (r) => r.aagluDue),
    chalu: sum(rows, (r) => r.chaluDue),
    withDue: rows.filter((r) => r.totalDue > 0.004).length,
  };
  const counts = {
    due: totals.withDue,
    all: rows.length,
    settled: rows.length - totals.withDue,
  };

  return (
    <div className="payment-reminder-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Payment Reminder</h1>
          <p className="page-subtitle">What each party owes, and every payment received</p>
        </div>
        <div className="page-header-actions">
          <button type="button" className="pr-secondary-button" onClick={() => setAllStatementsOpen(true)}>
            Download all statements
          </button>
        </div>
      </div>

      <div className="pr-stats">
        <div className="stat-card pr-stat pr-stat-main">
          <span className="stat-label">Total due</span>
          <span className="stat-value">{formatMoney(totals.official + totals.offline)}</span>
          <span className="pr-stat-sub">Official {formatMoney(totals.official)} · Offline {formatMoney(totals.offline)}</span>
        </div>
        <div className="stat-card pr-stat">
          <span className="stat-label" title="Still due from before this month">Aaglu khate</span>
          <span className="stat-value">{formatMoney(totals.aaglu)}</span>
          <span className="pr-stat-sub">Due from before {monthLabel}</span>
        </div>
        <div className="stat-card pr-stat">
          <span className="stat-label" title={`Still due on ${monthLabel} orders`}>Chalu khate</span>
          <span className="stat-value">{formatMoney(totals.chalu)}</span>
          <span className="pr-stat-sub">Due on {monthLabel} orders</span>
        </div>
        <div className="stat-card pr-stat">
          <span className="stat-label">Parties with due</span>
          <span className="stat-value">{totals.withDue}</span>
          <span className="pr-stat-sub">of {rows.length} {rows.length === 1 ? 'party' : 'parties'}</span>
        </div>
      </div>

      <div className="pr-toolbar">
        <div className="order-search pr-search">
          <img src={SearchIcon} alt="" />
          <input
            type="text"
            placeholder="Search party"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search party"
          />
        </div>
        <div className="pr-chips" role="group" aria-label="Show">
          {([
            ['due', 'With due'],
            ['all', 'All'],
            ['settled', 'Settled'],
          ] as [Show, string][]).map(([key, label]) => (
            <button key={key} type="button" className={`filter-chip${show === key ? ' active' : ''}`} onClick={() => setShow(key)}>
              {label} <span className="pr-chip-count">{counts[key]}</span>
            </button>
          ))}
        </div>
        <label className="pr-sort">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="due">Highest due</option>
            <option value="oldestPayment">Longest since payment</option>
            <option value="name">Name A–Z</option>
          </select>
        </label>
      </div>

      <div className="payment-table-container">
        {loading ? (
          <Loading message="Loading party balances..." size="large" />
        ) : error ? (
          <div className="pr-error">
            {error}
            <button type="button" className="pr-secondary-button" onClick={() => { setLoading(true); load(); }}>Try again</button>
          </div>
        ) : (
          <table className="pr-table">
            <thead>
              <tr>
                <th>Party</th>
                <th className="num">Official due</th>
                <th className="num">Offline due</th>
                <th className="num">Total due</th>
                <th className="num" title="Due from before this month">Aaglu</th>
                <th className="num" title={`Due on ${monthLabel} orders`}>Chalu</th>
                <th>Last payment</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={8} className="pr-empty">
                    {rows.length === 0
                      ? 'No parties on this floor yet.'
                      : search
                        ? `No party matches “${search}”.`
                        : show === 'due'
                          ? 'Nothing is due. Every party is settled.'
                          : 'No parties to show.'}
                  </td>
                </tr>
              ) : (
                visible.map((r) => {
                  const days = daysSince(r.lastPaymentDate);
                  const settled = r.totalDue <= 0.004;
                  return (
                    <tr
                      key={r.partyId}
                      className="pr-row"
                      onClick={() => setOpenParty({ partyId: r.partyId, name: r.partyName, receive: false })}
                    >
                      <td>
                        <div className="pr-party">
                          <span className="pr-party-name">{r.partyName}</span>
                          <span className="pr-party-sub">
                            {r.orderCount} {r.orderCount === 1 ? 'order' : 'orders'}
                            {r.official.openingDue + r.offline.openingDue > 0.004 && ' · opening balance due'}
                          </span>
                        </div>
                      </td>
                      <td className={`num${r.official.due > 0.004 ? ' due' : ''}`}>{formatMoney(r.official.due)}</td>
                      <td className={`num${r.offline.due > 0.004 ? ' due' : ''}`}>{formatMoney(r.offline.due)}</td>
                      <td className="num">
                        {settled ? <span className="pr-settled">Settled</span> : <strong>{formatMoney(r.totalDue)}</strong>}
                      </td>
                      <td className="num muted">{formatMoney(r.aagluDue)}</td>
                      <td className="num muted">{formatMoney(r.chaluDue)}</td>
                      <td>
                        {r.lastPaymentDate ? (
                          <div className="pr-last">
                            <span>{formatMoney(r.lastPaymentAmount)} on {formatDate(r.lastPaymentDate)}</span>
                            {days !== null && <span className={`pr-last-sub${days > 60 && !settled ? ' late' : ''}`}>{days === 0 ? 'today' : `${days} days ago`}</span>}
                          </div>
                        ) : (
                          <span className={`pr-last-sub${settled ? '' : ' late'}`}>Never paid</span>
                        )}
                      </td>
                      <td>
                        <div className="pr-actions" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="pr-receive"
                            disabled={settled}
                            onClick={() => setOpenParty({ partyId: r.partyId, name: r.partyName, receive: true })}
                          >
                            Receive
                          </button>
                          <button
                            type="button"
                            className="pr-open"
                            onClick={() => setOpenParty({ partyId: r.partyId, name: r.partyName, receive: false })}
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {openParty && (
        <PartyAccountPanel
          partyId={openParty.partyId}
          partyName={openParty.name}
          floor={floor}
          startReceiving={openParty.receive}
          onClose={() => setOpenParty(null)}
          onChanged={load}
        />
      )}

      {allStatementsOpen && (
        <StatementDownloadModal floor={floor} onClose={() => setAllStatementsOpen(false)} />
      )}
    </div>
  );
};

export default PaymentReminderPage;
