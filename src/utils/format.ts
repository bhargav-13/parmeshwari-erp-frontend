/** Formats a weight to exactly 3 decimals (e.g. 119.1499999 → "119.150"). */
export const formatQty = (value: number | null | undefined): string =>
  (Number(value) || 0).toFixed(3);

/** Today's date as YYYY-MM-DD in local time (toISOString gives the UTC date, a day behind before 5:30 AM IST). */
export const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * A date as dd/mm/yyyy, the format used everywhere in the app. Takes yyyy-mm-dd strings (read as
 * written, never shifted by time zone), full ISO date-times or Date objects; empty gives '—'.
 */
export const formatDate = (value: string | Date | null | undefined): string => {
  if (!value) return '—';
  if (typeof value === 'string') {
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

/** dd/mm/yyyy typed by a user as yyyy-mm-dd, or null when it is not a real date. */
export const parseDmy = (text: string): string | null => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

/** A date (yyyy-mm-dd string or Date from the API client) as yyyy-mm-dd for a date field. */
export const toIsoDate = (value: string | Date | null | undefined): string => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
};
