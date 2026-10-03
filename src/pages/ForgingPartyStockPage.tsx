import React, { useEffect, useMemo, useState } from 'react';
import {
    Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine,
    ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import './CastingPage.css';
import './ForgingPartyStockPage.css';
import SearchIcon from '../assets/search.svg';
import Loading from '../components/Loading';
import { forgingInwardApi, forgingOutwardApi } from '../api/forging';
import type { ForgingInward, ForgingOutward } from '../types';

// Chart colours (validated categorical slots); net stock uses its own sign colours
const COLOR_OUTWARD = '#2a78d6';
const COLOR_INWARD = '#eb6834';
const COLOR_POSITIVE = '#1baf7a';
const COLOR_NEGATIVE = '#d03b3b';
const MIX_COLORS: Record<InwardKind, string> = {
    CHHOL: '#1baf7a',
    TAIYAR_MAAL: '#eda100',
    REJECTION: '#4a3aa7',
    KG: '#e87ba4',
};
const KIND_LABEL: Record<InwardKind, string> = {
    CHHOL: 'Chhol',
    TAIYAR_MAAL: 'Tayar Maal',
    REJECTION: 'Rejection',
    KG: 'KG',
};

type InwardKind = 'CHHOL' | 'TAIYAR_MAAL' | 'REJECTION' | 'KG';
type Period = 'all' | 'month' | '3m' | '6m' | 'year' | 'custom';
type SortKey = 'partyName' | 'opening' | 'outward' | 'inward' | 'net' | 'lastDate' | 'entries';

interface PartyRow {
    partyName: string;
    opening: number;
    outward: number;
    chhol: number;
    taiyarMaal: number;
    rejection: number;
    kg: number;
    inward: number;
    net: number;
    lastDate: number;
    entries: number;
}

// Entries carry DD/MM/YYYY dates
const parseDate = (d: string): number => {
    const [dd, mm, yyyy] = (d || '').split('/').map(Number);
    if (!dd || !mm || !yyyy) return 0;
    return new Date(yyyy, mm - 1, dd).getTime();
};

const inwardKind = (unit: string): InwardKind => {
    const u = (unit || '').toUpperCase().replace(/\s+/g, '_');
    if (u === 'CHHOL' || u === 'TAIYAR_MAAL' || u === 'REJECTION') return u;
    return 'KG';
};

const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtShort = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtDate = (t: number) => (t ? new Date(t).toLocaleDateString('en-GB') : '—');
const toInputDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = (t: number) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'short', year: '2-digit' });
};

const periodRange = (period: Period, customFrom: string, customTo: string): { from: number | null; to: number | null } => {
    const now = new Date();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();
    switch (period) {
        case 'month':
            return { from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(), to: endOfToday };
        case '3m':
            return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1).getTime(), to: endOfToday };
        case '6m':
            return { from: new Date(now.getFullYear(), now.getMonth() - 5, 1).getTime(), to: endOfToday };
        case 'year':
            return { from: new Date(now.getFullYear(), 0, 1).getTime(), to: endOfToday };
        case 'custom': {
            const from = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : null;
            const to = customTo ? new Date(`${customTo}T23:59:59`).getTime() : null;
            return { from, to };
        }
        default:
            return { from: null, to: null };
    }
};

const signClass = (n: number) => (n < -0.0001 ? 'ps-negative' : '');

const ForgingPartyStockPage: React.FC = () => {
    const [inwards, setInwards] = useState<ForgingInward[]>([]);
    const [outwards, setOutwards] = useState<ForgingOutward[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [period, setPeriod] = useState<Period>('all');
    const [customFrom, setCustomFrom] = useState(toInputDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
    const [customTo, setCustomTo] = useState(toInputDate(new Date()));
    const [onlyMinus, setOnlyMinus] = useState(false);
    const [selectedParty, setSelectedParty] = useState<string | null>(null);
    const [sortKey, setSortKey] = useState<SortKey>('net');
    const [sortAsc, setSortAsc] = useState(false);

    useEffect(() => {
        Promise.all([forgingInwardApi.getAll(), forgingOutwardApi.getAll()])
            .then(([inData, outData]) => {
                setInwards(inData);
                setOutwards(outData);
            })
            .catch(err => {
                console.error('Error loading forging party stock:', err);
                setError('Failed to load forging data. Please try again.');
            })
            .finally(() => setLoading(false));
    }, []);

    const { from, to } = periodRange(period, customFrom, customTo);

    // Per-party balance: opening (everything before the period) + wire sent − material returned
    const rows = useMemo<PartyRow[]>(() => {
        const map = new Map<string, PartyRow>();
        const get = (name: string) => {
            const key = name?.trim() || 'Unknown';
            let row = map.get(key);
            if (!row) {
                row = { partyName: key, opening: 0, outward: 0, chhol: 0, taiyarMaal: 0, rejection: 0, kg: 0, inward: 0, net: 0, lastDate: 0, entries: 0 };
                map.set(key, row);
            }
            return row;
        };
        const inPeriod = (t: number) => (from === null || t >= from) && (to === null || t <= to);
        const beforePeriod = (t: number) => from !== null && t < from;

        for (const o of outwards) {
            const t = parseDate(o.date);
            const row = get(o.partyName);
            const w = Number(o.weight) || 0;
            if (beforePeriod(t)) row.opening += w;
            else if (inPeriod(t)) {
                row.outward += w;
                row.entries += 1;
                row.lastDate = Math.max(row.lastDate, t);
            }
        }
        for (const i of inwards) {
            const t = parseDate(i.date);
            const row = get(i.partyName);
            const w = Number(i.weight) || 0;
            if (beforePeriod(t)) row.opening -= w;
            else if (inPeriod(t)) {
                const kind = inwardKind(i.weightUnit);
                if (kind === 'CHHOL') row.chhol += w;
                else if (kind === 'TAIYAR_MAAL') row.taiyarMaal += w;
                else if (kind === 'REJECTION') row.rejection += w;
                else row.kg += w;
                row.inward += w;
                row.entries += 1;
                row.lastDate = Math.max(row.lastDate, t);
            }
        }
        const result: PartyRow[] = [];
        map.forEach(row => {
            row.net = row.opening + row.outward - row.inward;
            // Hide parties with nothing to show for this period
            if (row.entries > 0 || Math.abs(row.opening) > 0.0001) result.push(row);
        });
        return result;
    }, [inwards, outwards, from, to]);

    const visibleRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        let list = rows.filter(r => !q || r.partyName.toLowerCase().includes(q));
        if (onlyMinus) list = list.filter(r => r.net < -0.0001);
        const dir = sortAsc ? 1 : -1;
        return [...list].sort((a, b) => {
            if (sortKey === 'partyName') return a.partyName.localeCompare(b.partyName) * dir;
            return ((a[sortKey] as number) - (b[sortKey] as number)) * dir;
        });
    }, [rows, search, onlyMinus, sortKey, sortAsc]);

    const totals = useMemo(() => visibleRows.reduce(
        (acc, r) => ({
            opening: acc.opening + r.opening,
            outward: acc.outward + r.outward,
            chhol: acc.chhol + r.chhol,
            taiyarMaal: acc.taiyarMaal + r.taiyarMaal,
            rejection: acc.rejection + r.rejection,
            kg: acc.kg + r.kg,
            inward: acc.inward + r.inward,
            net: acc.net + r.net,
            entries: acc.entries + r.entries,
        }),
        { opening: 0, outward: 0, chhol: 0, taiyarMaal: 0, rejection: 0, kg: 0, inward: 0, net: 0, entries: 0 }
    ), [visibleRows]);

    const minusCount = visibleRows.filter(r => r.net < -0.0001).length;
    const showKg = totals.kg > 0;
    const showOpening = from !== null;

    // Charts follow the clicked party, otherwise every visible party
    const chartParties = useMemo(
        () => new Set(selectedParty ? [selectedParty] : visibleRows.map(r => r.partyName)),
        [selectedParty, visibleRows]
    );

    const netChartData = useMemo(
        () => [...visibleRows]
            .sort((a, b) => b.net - a.net)
            .map(r => ({ name: r.partyName, net: Number(r.net.toFixed(2)) })),
        [visibleRows]
    );

    const monthlyData = useMemo(() => {
        const buckets = new Map<string, { outward: number; inward: number }>();
        const inPeriod = (t: number) => t > 0 && (from === null || t >= from) && (to === null || t <= to);
        const add = (t: number, field: 'outward' | 'inward', w: number) => {
            const key = monthKey(t);
            const b = buckets.get(key) ?? { outward: 0, inward: 0 };
            b[field] += w;
            buckets.set(key, b);
        };
        for (const o of outwards) {
            const t = parseDate(o.date);
            if (inPeriod(t) && chartParties.has(o.partyName?.trim() || 'Unknown')) add(t, 'outward', Number(o.weight) || 0);
        }
        for (const i of inwards) {
            const t = parseDate(i.date);
            if (inPeriod(t) && chartParties.has(i.partyName?.trim() || 'Unknown')) add(t, 'inward', Number(i.weight) || 0);
        }
        return Array.from(buckets.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)
            .map(([key, v]) => ({
                month: monthLabel(key),
                outward: Number(v.outward.toFixed(2)),
                inward: Number(v.inward.toFixed(2)),
            }));
    }, [inwards, outwards, chartParties, from, to]);

    const mixData = useMemo(() => {
        const src = selectedParty ? visibleRows.filter(r => r.partyName === selectedParty) : visibleRows;
        const sum = (f: (r: PartyRow) => number) => src.reduce((s, r) => s + f(r), 0);
        return ([
            { kind: 'CHHOL', value: sum(r => r.chhol) },
            { kind: 'TAIYAR_MAAL', value: sum(r => r.taiyarMaal) },
            { kind: 'REJECTION', value: sum(r => r.rejection) },
            { kind: 'KG', value: sum(r => r.kg) },
        ] as { kind: InwardKind; value: number }[])
            .filter(d => d.value > 0)
            .map(d => ({ ...d, name: KIND_LABEL[d.kind], value: Number(d.value.toFixed(2)) }));
    }, [visibleRows, selectedParty]);
    const mixTotal = mixData.reduce((s, d) => s + d.value, 0);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(!sortAsc);
        else {
            setSortKey(key);
            setSortAsc(key === 'partyName');
        }
    };
    const sortArrow = (key: SortKey) => (sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '');

    if (loading) return <Loading message="Loading party stock..." />;

    return (
        <div className="casting-page party-stock-page">
            <div className="page-header">
                <div className="page-title-section">
                    <h1 className="page-title">Forging Party Stock</h1>
                    <p className="page-subtitle">Material lying with each forging party — wire sent (outward) minus material returned (inward)</p>
                </div>
            </div>

            {error && <div className="ps-error">{error}</div>}

            {/* Filters */}
            <div className="ps-filters">
                <div className="order-search ps-search">
                    <img src={SearchIcon} alt="" />
                    <input
                        type="text"
                        placeholder="Search party"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        aria-label="Search party"
                    />
                </div>
                <select
                    className="month-filter-select"
                    value={period}
                    onChange={e => setPeriod(e.target.value as Period)}
                    aria-label="Period"
                >
                    <option value="all">All time</option>
                    <option value="month">This month</option>
                    <option value="3m">Last 3 months</option>
                    <option value="6m">Last 6 months</option>
                    <option value="year">This year</option>
                    <option value="custom">Custom range</option>
                </select>
                {period === 'custom' && (
                    <>
                        <input type="date" className="month-filter-select" value={customFrom} onChange={e => setCustomFrom(e.target.value)} aria-label="From date" />
                        <input type="date" className="month-filter-select" value={customTo} onChange={e => setCustomTo(e.target.value)} aria-label="To date" />
                    </>
                )}
                <label className="ps-toggle">
                    <input type="checkbox" checked={onlyMinus} onChange={e => setOnlyMinus(e.target.checked)} />
                    Only minus parties
                </label>
            </div>

            {/* KPIs */}
            <div className="ps-kpis">
                <div className="casting-stat-card">
                    <span className="stat-title">Wire Sent (Outward)</span>
                    <span className="stat-value">{fmt(totals.outward)}</span>
                </div>
                <div className="casting-stat-card">
                    <span className="stat-title">Material Returned (Inward)</span>
                    <span className="stat-value">{fmt(totals.inward)}</span>
                </div>
                <div className={`casting-stat-card ${totals.net < -0.0001 ? 'ps-card-negative' : ''}`}>
                    <span className="stat-title">Net Stock with Parties</span>
                    <span className={`stat-value ${signClass(totals.net)}`}>{fmt(totals.net)}</span>
                    {showOpening && <span className="ps-kpi-note">Includes opening {fmt(totals.opening)}</span>}
                </div>
                <div className={`casting-stat-card ${minusCount > 0 ? 'ps-card-negative' : ''}`}>
                    <span className="stat-title">Parties in Minus</span>
                    <span className={`stat-value ${minusCount > 0 ? 'ps-negative' : ''}`}>
                        {minusCount} <span className="ps-kpi-of">/ {visibleRows.length}</span>
                    </span>
                </div>
            </div>

            {selectedParty && (
                <div className="ps-selected">
                    Charts showing <strong>{selectedParty}</strong>
                    <button type="button" onClick={() => setSelectedParty(null)}>Show all parties</button>
                </div>
            )}

            {/* Charts */}
            <div className="ps-charts">
                <div className="ps-chart-card ps-chart-wide">
                    <div className="ps-chart-head">
                        <h3>Net stock by party</h3>
                        <span className="ps-legend">
                            <i style={{ background: COLOR_POSITIVE }} /> With party
                            <i style={{ background: COLOR_NEGATIVE }} /> Minus
                        </span>
                    </div>
                    {netChartData.length === 0 ? (
                        <div className="ps-empty">No parties for this period</div>
                    ) : (
                        <div className="ps-net-scroll">
                            <ResponsiveContainer width="100%" height={Math.max(160, netChartData.length * 30 + 40)}>
                                <BarChart data={netChartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                                    <CartesianGrid horizontal={false} stroke="var(--border)" />
                                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: 'var(--text-secondary)' }} axisLine={false} tickLine={false} />
                                    <ReferenceLine x={0} stroke="var(--border-strong)" />
                                    <Tooltip
                                        cursor={{ fill: 'var(--surface-hover)' }}
                                        formatter={(v) => [fmt(Number(v)), 'Net stock']}
                                    />
                                    <Bar
                                        dataKey="net"
                                        barSize={16}
                                        radius={4}
                                        onClick={(d) => {
                                            const name = (d as { name?: string })?.name;
                                            if (name) setSelectedParty(name === selectedParty ? null : name);
                                        }}
                                        cursor="pointer"
                                    >
                                        {netChartData.map(d => (
                                            <Cell
                                                key={d.name}
                                                fill={d.net < 0 ? COLOR_NEGATIVE : COLOR_POSITIVE}
                                                fillOpacity={selectedParty && selectedParty !== d.name ? 0.35 : 1}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                <div className="ps-chart-card">
                    <div className="ps-chart-head">
                        <h3>Monthly outward vs inward</h3>
                    </div>
                    {monthlyData.length === 0 ? (
                        <div className="ps-empty">No entries for this period</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={monthlyData} barGap={2} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={56} />
                                <Tooltip cursor={{ fill: 'var(--surface-hover)' }} formatter={(v, n) => [fmt(Number(v)), n]} />
                                <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="outward" name="Outward (Wire)" fill={COLOR_OUTWARD} radius={[4, 4, 0, 0]} maxBarSize={22} />
                                <Bar dataKey="inward" name="Inward (Returned)" fill={COLOR_INWARD} radius={[4, 4, 0, 0]} maxBarSize={22} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="ps-chart-card">
                    <div className="ps-chart-head">
                        <h3>Inward mix</h3>
                    </div>
                    {mixData.length === 0 ? (
                        <div className="ps-empty">No inward for this period</div>
                    ) : (
                        <div className="ps-mix">
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={mixData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>
                                        {mixData.map(d => <Cell key={d.kind} fill={MIX_COLORS[d.kind]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v, n) => [fmt(Number(v)), n]} />
                                </PieChart>
                            </ResponsiveContainer>
                            <ul className="ps-mix-list">
                                {mixData.map(d => (
                                    <li key={d.kind}>
                                        <i style={{ background: MIX_COLORS[d.kind] }} />
                                        <span>{d.name}</span>
                                        <strong>{fmt(d.value)}</strong>
                                        <em>{mixTotal ? Math.round((d.value / mixTotal) * 100) : 0}%</em>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="casting-table-container">
                <table className="casting-table ps-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('partyName')}>Party{sortArrow('partyName')}</th>
                            {showOpening && <th onClick={() => handleSort('opening')}>Opening{sortArrow('opening')}</th>}
                            <th onClick={() => handleSort('outward')}>Wire (Out){sortArrow('outward')}</th>
                            <th>Chhol</th>
                            <th>Tayar Maal</th>
                            <th>Rejection</th>
                            {showKg && <th>KG</th>}
                            <th onClick={() => handleSort('inward')}>Total Inward{sortArrow('inward')}</th>
                            <th onClick={() => handleSort('net')}>Net Stock{sortArrow('net')}</th>
                            <th onClick={() => handleSort('lastDate')}>Last Entry{sortArrow('lastDate')}</th>
                            <th onClick={() => handleSort('entries')}>Entries{sortArrow('entries')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleRows.length === 0 ? (
                            <tr>
                                <td colSpan={11} className="ps-empty-row">No parties found</td>
                            </tr>
                        ) : visibleRows.map(r => (
                            <tr
                                key={r.partyName}
                                className={`${r.net < -0.0001 ? 'ps-row-negative' : ''} ${selectedParty === r.partyName ? 'ps-row-selected' : ''}`}
                                onClick={() => setSelectedParty(selectedParty === r.partyName ? null : r.partyName)}
                                title="Click to show this party in the charts"
                            >
                                <td className="ps-party">{r.partyName}</td>
                                {showOpening && <td className={signClass(r.opening)}>{fmt(r.opening)}</td>}
                                <td>{fmt(r.outward)}</td>
                                <td>{fmt(r.chhol)}</td>
                                <td>{fmt(r.taiyarMaal)}</td>
                                <td>{fmt(r.rejection)}</td>
                                {showKg && <td>{fmt(r.kg)}</td>}
                                <td>{fmt(r.inward)}</td>
                                <td className={`ps-net ${signClass(r.net)}`}>{fmt(r.net)}</td>
                                <td>{fmtDate(r.lastDate)}</td>
                                <td>{r.entries}</td>
                            </tr>
                        ))}
                    </tbody>
                    {visibleRows.length > 0 && (
                        <tfoot>
                            <tr>
                                <td className="ps-party">Total</td>
                                {showOpening && <td className={signClass(totals.opening)}>{fmt(totals.opening)}</td>}
                                <td>{fmt(totals.outward)}</td>
                                <td>{fmt(totals.chhol)}</td>
                                <td>{fmt(totals.taiyarMaal)}</td>
                                <td>{fmt(totals.rejection)}</td>
                                {showKg && <td>{fmt(totals.kg)}</td>}
                                <td>{fmt(totals.inward)}</td>
                                <td className={`ps-net ${signClass(totals.net)}`}>{fmt(totals.net)}</td>
                                <td></td>
                                <td>{totals.entries}</td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>
        </div>
    );
};

export default ForgingPartyStockPage;
