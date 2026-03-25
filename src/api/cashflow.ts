import type {
    CashflowEntry,
    CashflowEntryRequest,
    CashflowParty,
    CashflowPaymentType,
    CashflowDailySummary,
    CashflowCloseDayResponse,
} from '../types';

const BASE_URL =
    (import.meta as any).env?.VITE_API_BASE_URL?.trim() || 'http://localhost:8080';

const authFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...((options.headers as Record<string, string>) || {}),
        },
    });
    if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        throw new Error(errBody || `Request failed: ${response.statusText}`);
    }
    if (response.status === 204) return null;
    const text = await response.text();
    return text ? JSON.parse(text) : null;
};

// Income API
export const cashflowIncomeApi = {
    getAll: (date?: string): Promise<CashflowEntry[]> =>
        authFetch(`/api/v1/cashflow/income?page=0&size=1000${date ? `&date=${date}` : ''}`)
            .then((res: any) => res?.data || res?.content || []),

    create: (data: CashflowEntryRequest): Promise<CashflowEntry> =>
        authFetch('/api/v1/cashflow/income', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: number, data: CashflowEntryRequest): Promise<CashflowEntry> =>
        authFetch(`/api/v1/cashflow/income/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id: number): Promise<void> =>
        authFetch(`/api/v1/cashflow/income/${id}`, { method: 'DELETE' }),
};

// Expense API
export const cashflowExpenseApi = {
    getAll: (date?: string): Promise<CashflowEntry[]> =>
        authFetch(`/api/v1/cashflow/expense?page=0&size=1000${date ? `&date=${date}` : ''}`)
            .then((res: any) => res?.data || res?.content || []),

    create: (data: CashflowEntryRequest): Promise<CashflowEntry> =>
        authFetch('/api/v1/cashflow/expense', { method: 'POST', body: JSON.stringify(data) }),

    update: (id: number, data: CashflowEntryRequest): Promise<CashflowEntry> =>
        authFetch(`/api/v1/cashflow/expense/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    delete: (id: number): Promise<void> =>
        authFetch(`/api/v1/cashflow/expense/${id}`, { method: 'DELETE' }),
};

// Summary API
export const cashflowSummaryApi = {
    get: (date?: string): Promise<CashflowDailySummary> =>
        authFetch(`/api/v1/cashflow/summary${date ? `?date=${date}` : ''}`),

    closeDay: (date?: string): Promise<CashflowCloseDayResponse> =>
        authFetch(`/api/v1/cashflow/close-day${date ? `?date=${date}` : ''}`, { method: 'POST' }),
};

// Payment Types API
export const cashflowPaymentTypeApi = {
    getAll: (): Promise<CashflowPaymentType[]> =>
        authFetch('/api/v1/cashflow/payment-types'),

    create: (name: string): Promise<CashflowPaymentType> =>
        authFetch('/api/v1/cashflow/payment-types', { method: 'POST', body: JSON.stringify({ name }) }),

    delete: (id: number): Promise<void> =>
        authFetch(`/api/v1/cashflow/payment-types/${id}`, { method: 'DELETE' }),
};

// Party API
export const cashflowPartyApi = {
    getAll: (): Promise<CashflowParty[]> =>
        authFetch('/api/v1/cashflow/parties'),

    create: (name: string): Promise<CashflowParty> =>
        authFetch('/api/v1/cashflow/parties', { method: 'POST', body: JSON.stringify({ name }) }),

    delete: (id: number): Promise<void> =>
        authFetch(`/api/v1/cashflow/parties/${id}`, { method: 'DELETE' }),
};
