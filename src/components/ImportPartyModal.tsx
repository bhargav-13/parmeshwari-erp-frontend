import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type { Party, PurchaseParty, Floor } from '../types';
import { partyApi } from '../api/party';
import { purchasePartyApi } from '../api/purchaseParty';
import './ImportPartyModal.css';
import { canPickFloor, getUserFloor } from '../lib/auth';

type PartyType = 'sales' | 'purchase';

interface ParsedRow {
  rowIndex: number;
  name: string;
  officialAmount: number;
  offlineAmount: number;
  // extra fields from excel - displayed but not imported
  whatsappNo?: string;
  city?: string;
}

type RowStatus = 'new' | 'exists' | 'duplicate_in_file' | 'invalid';
type ConflictAction = 'skip' | 'update' | 'create';

interface PreviewRow extends ParsedRow {
  status: RowStatus;
  conflictAction: ConflictAction;
  existingParty?: Party | PurchaseParty;
}

type ImportStep = 'upload' | 'preview' | 'conflict' | 'importing' | 'done';

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface Props {
  partyType: PartyType;
  existingParties: Party[] | PurchaseParty[];
  onClose: () => void;
  onSuccess: () => void;
}

const EXPECTED_HEADERS = ['party name', 'official amount', 'offline amount'];

const parseName = (v: any): string => (v == null ? '' : String(v).trim());
const parseAmount = (v: any): number => {
  if (v == null || v === '') return 0;
  const n = Number(String(v).replace(/[₹,\s]/g, ''));
  return isNaN(n) ? 0 : n;
};

function detectColumns(headers: string[]): { nameCol: number; officialCol: number; offlineCol: number; whatsappCol: number; cityCol: number } {
  const h = headers.map(s => (s ?? '').toLowerCase().trim());
  const find = (...terms: string[]) => {
    for (const t of terms) {
      const i = h.findIndex(s => s.includes(t));
      if (i !== -1) return i;
    }
    return -1;
  };
  return {
    nameCol: find('party name', 'name'),
    officialCol: find('official'),
    offlineCol: find('offline'),
    whatsappCol: find('whatsapp', 'mobile', 'phone'),
    cityCol: find('city'),
  };
}

const ImportPartyModal: React.FC<Props> = ({ partyType, existingParties, onClose, onSuccess }) => {
  const [step, setStep] = useState<ImportStep>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [defaultFloor, setDefaultFloor] = useState<Floor | ''>(getUserFloor() ?? '');
  const [globalConflictAction, setGlobalConflictAction] = useState<ConflictAction | 'manual'>('manual');

  // Conflict resolution wizard state
  const [conflictQueue, setConflictQueue] = useState<number[]>([]); // row indexes in conflict
  const [conflictCursor, setConflictCursor] = useState(0);
  const [pendingConflictAction, setPendingConflictAction] = useState<ConflictAction>('skip');

  // Import progress
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importingLabel, setImportingLabel] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const normalizeForCompare = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

  const parseFile = useCallback((file: File) => {
    setParseError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (raw.length < 2) {
          setParseError('The file has no data rows. Please fill in party data and try again.');
          return;
        }

        // Detect header row (first non-empty row)
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          const rowStr = raw[i].join(' ').toLowerCase();
          if (EXPECTED_HEADERS.some(h => rowStr.includes(h))) { headerRowIdx = i; break; }
        }

        const headers = raw[headerRowIdx].map(String);
        const cols = detectColumns(headers);

        if (cols.nameCol === -1) {
          setParseError('Could not find a "Party Name" column. Make sure your Excel has a "Party Name" header.');
          return;
        }

        // Build existing name map for duplicate detection
        const existingMap = new Map<string, Party | PurchaseParty>();
        for (const p of existingParties) {
          const key = normalizeForCompare((p as any).name);
          existingMap.set(key, p);
        }

        const seenNames = new Set<string>();
        const parsed: PreviewRow[] = [];

        for (let r = headerRowIdx + 1; r < raw.length; r++) {
          const row = raw[r];
          if (row.every((c: any) => c === '' || c == null)) continue; // blank row

          const name = parseName(cols.nameCol !== -1 ? row[cols.nameCol] : '');
          const officialAmount = parseAmount(cols.officialCol !== -1 ? row[cols.officialCol] : '');
          const offlineAmount = parseAmount(cols.offlineCol !== -1 ? row[cols.offlineCol] : '');
          const whatsappNo = cols.whatsappCol !== -1 ? parseName(row[cols.whatsappCol]) : '';
          const city = cols.cityCol !== -1 ? parseName(row[cols.cityCol]) : '';

          let status: RowStatus;
          let existingParty: Party | PurchaseParty | undefined;
          const key = normalizeForCompare(name);

          if (!name) {
            status = 'invalid';
          } else if (seenNames.has(key)) {
            status = 'duplicate_in_file';
          } else if (existingMap.has(key)) {
            status = 'exists';
            existingParty = existingMap.get(key);
          } else {
            status = 'new';
          }

          seenNames.add(key);
          parsed.push({
            rowIndex: r,
            name,
            officialAmount,
            offlineAmount,
            whatsappNo: whatsappNo || undefined,
            city: city || undefined,
            status,
            conflictAction: status === 'exists' ? 'skip' : 'skip',
            existingParty,
          });
        }

        if (parsed.length === 0) {
          setParseError('No valid data rows found after the header row.');
          return;
        }

        setRows(parsed);
        setStep('preview');
      } catch (err) {
        setParseError('Failed to read the file. Please make sure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsBinaryString(file);
  }, [existingParties]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) parseFile(file);
  };

  // Apply global conflict action to all 'exists' rows
  const applyGlobal = (action: ConflictAction | 'manual') => {
    setGlobalConflictAction(action);
    if (action !== 'manual') {
      setRows(prev => prev.map(r => r.status === 'exists' ? { ...r, conflictAction: action } : r));
    }
  };

  // Start conflict wizard for rows still marked 'manual' / that need resolution
  const startConflictWizard = () => {
    const queue = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.status === 'exists' && globalConflictAction === 'manual')
      .map(({ i }) => i);

    if (queue.length === 0) {
      startImport();
      return;
    }
    setConflictQueue(queue);
    setConflictCursor(0);
    setPendingConflictAction('skip');
    setStep('conflict');
  };

  const saveConflictAndNext = () => {
    const rowIdx = conflictQueue[conflictCursor];
    setRows(prev => prev.map((r, i) => i === rowIdx ? { ...r, conflictAction: pendingConflictAction } : r));

    if (conflictCursor + 1 < conflictQueue.length) {
      setConflictCursor(c => c + 1);
      setPendingConflictAction('skip');
    } else {
      // All conflicts resolved, start import
      startImportWithUpdatedRows(
        rows.map((r, i) => i === rowIdx ? { ...r, conflictAction: pendingConflictAction } : r)
      );
    }
  };

  const startImport = () => {
    startImportWithUpdatedRows(rows);
  };

  const startImportWithUpdatedRows = async (finalRows: PreviewRow[]) => {
    setStep('importing');
    const toProcess = finalRows.filter(r => r.status !== 'invalid' && r.status !== 'duplicate_in_file');
    setImportTotal(toProcess.length);
    setImportProgress(0);

    const result: ImportResult = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (let i = 0; i < toProcess.length; i++) {
      const row = toProcess[i];
      setImportingLabel(row.name);
      setImportProgress(i);

      try {
        const payload = {
          name: row.name,
          officialAmount: row.officialAmount,
          offlineAmount: row.offlineAmount,
          ...(defaultFloor ? { floor: defaultFloor as Floor } : {}),
          ...(row.whatsappNo ? { whatsappNo: row.whatsappNo } : {}),
          ...(row.city ? { city: row.city } : {}),
        };

        if (row.status === 'new') {
          if (partyType === 'sales') {
            await partyApi.createParty(payload);
          } else {
            await purchasePartyApi.create(payload);
          }
          result.created++;
        } else if (row.status === 'exists') {
          if (row.conflictAction === 'update' && row.existingParty) {
            const id = partyType === 'sales'
              ? (row.existingParty as Party).partyId
              : (row.existingParty as PurchaseParty).id;
            if (partyType === 'sales') {
              await partyApi.updateParty(id, payload);
            } else {
              await purchasePartyApi.update(id, payload);
            }
            result.updated++;
          } else if (row.conflictAction === 'create') {
            if (partyType === 'sales') {
              await partyApi.createParty(payload);
            } else {
              await purchasePartyApi.create(payload);
            }
            result.created++;
          } else {
            result.skipped++;
          }
        }
      } catch (err: any) {
        result.errors.push(`${row.name}: ${err?.message ?? 'Unknown error'}`);
      }

      setImportProgress(i + 1);
    }

    setImportResult(result);
    setStep('done');
    onSuccess();
  };

  const conflictRow = step === 'conflict' ? rows[conflictQueue[conflictCursor]] : null;
  const existingPartyForConflict = conflictRow?.existingParty;

  const countByStatus = (s: RowStatus) => rows.filter(r => r.status === s).length;
  const toImportCount = rows.filter(r => {
    if (r.status === 'invalid' || r.status === 'duplicate_in_file') return false;
    if (r.status === 'exists' && r.conflictAction === 'skip') return false;
    return true;
  }).length;

  const floorLabel = (f?: string) =>
    f === 'GROUND_FLOOR' ? 'Ground Floor' : f === 'FIRST_FLOOR' ? 'First Floor' : '—';

  return (
    <div className="modal-overlay drawer-overlay" onClick={onClose}>
      <div className="imp-modal" onClick={e => e.stopPropagation()}>

        {/* ─── STEP: UPLOAD ─── */}
        {step === 'upload' && (
          <>
            <div className="imp-header">
              <h2 className="imp-title">Import {partyType === 'sales' ? 'Sales' : 'Purchase'} Parties from Excel</h2>
              <button className="imp-close" onClick={onClose}>✕</button>
            </div>

            <div className="imp-upload-info">
              <p>Expected columns: <strong>Party Name</strong>, Official Amount, Offline Amount, Whatsapp No., City</p>
              <p className="imp-note">Party ID column is read for reference only. All other columns will be imported.</p>
            </div>

            {parseError && (
              <div className="imp-error-banner">
                <span className="imp-error-icon">⚠</span>
                {parseError}
              </div>
            )}

            <div
              className={`imp-dropzone${dragOver ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="imp-drop-icon">📂</div>
              <p className="imp-drop-text">Drop your Excel file here, or <span className="imp-link">browse</span></p>
              <p className="imp-drop-hint">.xlsx or .xls files only</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <div className="imp-footer">
              <button className="cancel-button" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {/* ─── STEP: PREVIEW ─── */}
        {step === 'preview' && (
          <>
            <div className="imp-header">
              <div>
                <h2 className="imp-title">Preview — {fileName}</h2>
                <p className="imp-subtitle">{rows.length} rows detected</p>
              </div>
              <button className="imp-close" onClick={onClose}>✕</button>
            </div>

            {/* Status summary chips */}
            <div className="imp-summary-chips">
              {countByStatus('new') > 0 && <span className="chip chip-new">✅ {countByStatus('new')} New</span>}
              {countByStatus('exists') > 0 && <span className="chip chip-exists">⚠️ {countByStatus('exists')} Already Exist</span>}
              {countByStatus('duplicate_in_file') > 0 && <span className="chip chip-dup">↩️ {countByStatus('duplicate_in_file')} Duplicate in file</span>}
              {countByStatus('invalid') > 0 && <span className="chip chip-invalid">❌ {countByStatus('invalid')} Invalid</span>}
            </div>

            {/* Global conflict action (only if there are conflicts) */}
            {countByStatus('exists') > 0 && (
              <div className="imp-conflict-global">
                <span className="imp-conflict-label">For all duplicates:</span>
                <div className="imp-conflict-btns">
                  {(['manual', 'skip', 'update', 'create'] as const).map(a => (
                    <button
                      key={a}
                      type="button"
                      className={`imp-conflict-chip${globalConflictAction === a ? ' active' : ''}`}
                      onClick={() => applyGlobal(a)}
                    >
                      {a === 'manual' ? 'Resolve one by one' : a === 'skip' ? 'Skip all' : a === 'update' ? 'Update all' : 'Create duplicates'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Default floor */}
            <div className="imp-floor-row">
              <label className="form-label">Default Floor for new parties:</label>
              <select
                className="form-input imp-floor-select"
                value={defaultFloor}
                onChange={e => setDefaultFloor(e.target.value as Floor | '')}
                disabled={getUserFloor() !== null}
              >
                {getUserFloor() === null && <option value="">— None —</option>}
                {canPickFloor('GROUND_FLOOR') && <option value="GROUND_FLOOR">Ground Floor</option>}
                {canPickFloor('FIRST_FLOOR') && <option value="FIRST_FLOOR">First Floor</option>}
              </select>
            </div>

            {/* Preview table */}
            <div className="imp-table-wrap">
              <table className="imp-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Party Name</th>
                    <th>Official Amt</th>
                    <th>Offline Amt</th>
                    <th>WhatsApp No.</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={`imp-tr-${row.status}`}>
                      <td>{i + 1}</td>
                      <td className="imp-name-cell">
                        {row.name || <em className="imp-empty">(blank)</em>}
                      </td>
                      <td>₹{row.officialAmount.toLocaleString('en-IN')}</td>
                      <td>₹{row.offlineAmount.toLocaleString('en-IN')}</td>
                      <td>{row.whatsappNo || <em className="imp-empty">—</em>}</td>
                      <td>{row.city || <em className="imp-empty">—</em>}</td>
                      <td>
                        {row.status === 'new' && <span className="imp-badge badge-new">New</span>}
                        {row.status === 'exists' && <span className="imp-badge badge-exists">Exists</span>}
                        {row.status === 'duplicate_in_file' && <span className="imp-badge badge-dup">Dup in file</span>}
                        {row.status === 'invalid' && <span className="imp-badge badge-invalid">Invalid</span>}
                      </td>
                      <td>
                        {row.status === 'exists' && (
                          <select
                            className="imp-action-select"
                            value={row.conflictAction}
                            onChange={e => {
                              const val = e.target.value as ConflictAction;
                              setRows(prev => prev.map((r, idx) => idx === i ? { ...r, conflictAction: val } : r));
                              setGlobalConflictAction('manual');
                            }}
                          >
                            <option value="skip">Skip</option>
                            <option value="update">Update</option>
                            <option value="create">Create anyway</option>
                          </select>
                        )}
                        {row.status === 'new' && <span className="imp-will-create">Will create</span>}
                        {row.status === 'invalid' && <span className="imp-will-skip imp-skip-red">Will skip</span>}
                        {row.status === 'duplicate_in_file' && <span className="imp-will-skip">Will skip</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="imp-footer">
              <button className="cancel-button" onClick={() => setStep('upload')}>← Back</button>
              <button
                className="save-button"
                disabled={toImportCount === 0 && countByStatus('new') === 0}
                onClick={startConflictWizard}
              >
                {globalConflictAction === 'manual' && countByStatus('exists') > 0
                  ? `Resolve ${countByStatus('exists')} Conflict${countByStatus('exists') > 1 ? 's' : ''} →`
                  : `Import ${toImportCount} Part${toImportCount === 1 ? 'y' : 'ies'}`
                }
              </button>
            </div>
          </>
        )}

        {/* ─── STEP: CONFLICT WIZARD ─── */}
        {step === 'conflict' && conflictRow && (
          <>
            <div className="imp-header">
              <div>
                <h2 className="imp-title">Resolve Conflict</h2>
                <p className="imp-subtitle">{conflictCursor + 1} of {conflictQueue.length}</p>
              </div>
              <button className="imp-close" onClick={onClose}>✕</button>
            </div>

            <div className="imp-conflict-progress">
              <div
                className="imp-conflict-bar"
                style={{ width: `${((conflictCursor) / conflictQueue.length) * 100}%` }}
              />
            </div>

            <div className="imp-conflict-card">
              <p className="imp-conflict-title">
                Party <strong>"{conflictRow.name}"</strong> already exists in your system.
              </p>

              <div className="imp-compare-grid">
                <div className="imp-compare-col imp-compare-existing">
                  <p className="imp-compare-heading">Existing in system</p>
                  <div className="imp-compare-row">
                    <span>Official Amt</span>
                    <strong>₹{((existingPartyForConflict as any)?.officialAmount ?? 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="imp-compare-row">
                    <span>Offline Amt</span>
                    <strong>₹{((existingPartyForConflict as any)?.offlineAmount ?? 0).toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="imp-compare-row">
                    <span>Floor</span>
                    <strong>{floorLabel((existingPartyForConflict as any)?.floor)}</strong>
                  </div>
                  {(existingPartyForConflict as any)?.whatsappNo && (
                    <div className="imp-compare-row">
                      <span>WhatsApp</span>
                      <strong>{(existingPartyForConflict as any).whatsappNo}</strong>
                    </div>
                  )}
                  {(existingPartyForConflict as any)?.city && (
                    <div className="imp-compare-row">
                      <span>City</span>
                      <strong>{(existingPartyForConflict as any).city}</strong>
                    </div>
                  )}
                </div>
                <div className="imp-compare-arrow">→</div>
                <div className="imp-compare-col imp-compare-excel">
                  <p className="imp-compare-heading">From Excel</p>
                  <div className="imp-compare-row">
                    <span>Official Amt</span>
                    <strong>₹{conflictRow.officialAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="imp-compare-row">
                    <span>Offline Amt</span>
                    <strong>₹{conflictRow.offlineAmount.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="imp-compare-row">
                    <span>Floor</span>
                    <strong>{floorLabel(defaultFloor || undefined)}</strong>
                  </div>
                  {conflictRow.whatsappNo && (
                    <div className="imp-compare-row">
                      <span>WhatsApp</span>
                      <strong>{conflictRow.whatsappNo}</strong>
                    </div>
                  )}
                  {conflictRow.city && (
                    <div className="imp-compare-row">
                      <span>City</span>
                      <strong>{conflictRow.city}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* Action radio buttons */}
              <div className="imp-conflict-actions">
                {(['skip', 'update', 'create'] as ConflictAction[]).map(action => (
                  <label
                    key={action}
                    className={`imp-radio-label${pendingConflictAction === action ? ' selected' : ''}`}
                    onClick={() => setPendingConflictAction(action)}
                  >
                    <input
                      type="radio"
                      name="conflictAction"
                      value={action}
                      checked={pendingConflictAction === action}
                      onChange={() => setPendingConflictAction(action)}
                    />
                    <span className="imp-radio-title">
                      {action === 'skip' && 'Skip — keep existing party unchanged'}
                      {action === 'update' && 'Update — overwrite with Excel values'}
                      {action === 'create' && 'Create anyway — add as a new duplicate entry'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="imp-footer">
              <button className="cancel-button" onClick={() => setStep('preview')}>← Back to preview</button>
              <button className="save-button" onClick={saveConflictAndNext}>
                {conflictCursor + 1 < conflictQueue.length ? 'Save & Next →' : 'Save & Import'}
              </button>
            </div>
          </>
        )}

        {/* ─── STEP: IMPORTING ─── */}
        {step === 'importing' && (
          <div className="imp-progress-wrap">
            <div className="imp-progress-icon">⏳</div>
            <h2 className="imp-title">Importing parties…</h2>
            <p className="imp-importing-name">{importingLabel}</p>
            <div className="imp-progress-bar-wrap">
              <div
                className="imp-progress-bar-fill"
                style={{ width: importTotal > 0 ? `${(importProgress / importTotal) * 100}%` : '0%' }}
              />
            </div>
            <p className="imp-progress-text">{importProgress} / {importTotal}</p>
          </div>
        )}

        {/* ─── STEP: DONE ─── */}
        {step === 'done' && importResult && (
          <>
            <div className="imp-header">
              <h2 className="imp-title">Import Complete</h2>
              <button className="imp-close" onClick={onClose}>✕</button>
            </div>

            <div className="imp-done-grid">
              {importResult.created > 0 && (
                <div className="imp-done-card done-created">
                  <span className="imp-done-num">{importResult.created}</span>
                  <span className="imp-done-label">Created</span>
                </div>
              )}
              {importResult.updated > 0 && (
                <div className="imp-done-card done-updated">
                  <span className="imp-done-num">{importResult.updated}</span>
                  <span className="imp-done-label">Updated</span>
                </div>
              )}
              {importResult.skipped > 0 && (
                <div className="imp-done-card done-skipped">
                  <span className="imp-done-num">{importResult.skipped}</span>
                  <span className="imp-done-label">Skipped</span>
                </div>
              )}
              {importResult.errors.length > 0 && (
                <div className="imp-done-card done-errors">
                  <span className="imp-done-num">{importResult.errors.length}</span>
                  <span className="imp-done-label">Errors</span>
                </div>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="imp-error-list">
                <p className="imp-error-list-title">Errors:</p>
                {importResult.errors.map((e, i) => (
                  <p key={i} className="imp-error-item">• {e}</p>
                ))}
              </div>
            )}

            <div className="imp-footer">
              <button className="save-button" onClick={onClose}>Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ImportPartyModal;
