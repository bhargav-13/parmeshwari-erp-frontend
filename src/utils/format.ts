/** Formats a weight to exactly 3 decimals (e.g. 119.1499999 → "119.150"). */
export const formatQty = (value: number | null | undefined): string =>
  (Number(value) || 0).toFixed(3);
