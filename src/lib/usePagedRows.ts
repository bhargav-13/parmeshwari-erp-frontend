import { useEffect, useState } from 'react';

export const DEFAULT_PAGE_SIZE = 25;

/**
 * Shows a long list a page at a time. Pass the rows already searched/filtered; the page
 * goes back to the first one whenever the number of rows changes (a new search or filter).
 * Spread `pagination` into <Pagination />, which hides itself when everything fits on one page.
 */
export function usePagedRows<T>(rows: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(0);
  const total = rows.length;

  useEffect(() => {
    setPage(0);
  }, [total]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const offset = currentPage * pageSize;

  return {
    rows: rows.slice(offset, offset + pageSize),
    offset,
    pagination: {
      currentPage,
      totalPages,
      totalElements: total,
      size: pageSize,
      onPageChange: (next: number) => setPage(next),
    },
  };
}
