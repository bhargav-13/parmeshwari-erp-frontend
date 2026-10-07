/** Formats a weight to exactly 3 decimals (e.g. 119.1499999 → "119.150"). */
export const formatQty = (value: number | null | undefined): string =>
  (Number(value) || 0).toFixed(3);

/** Today's date as YYYY-MM-DD in local time (toISOString gives the UTC date, a day behind before 5:30 AM IST). */
export const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
