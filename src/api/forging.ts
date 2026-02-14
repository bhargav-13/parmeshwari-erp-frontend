import ForgingInwardApi from '../api-client/forging/src/api/ForgingInwardApi';
import ForgingOutwardApi from '../api-client/forging/src/api/ForgingOutwardApi';
import { promisify } from '../lib/apiConfig';
import type { ForgingInward, ForgingOutward } from '../types';

// Import shared API client (configured with auth interceptor)
import ApiClient from '../api-client/inventory/src/ApiClient';
const apiClient = ApiClient.instance;
const generatedForgingInwardApi = new ForgingInwardApi(apiClient);
const generatedForgingOutwardApi = new ForgingOutwardApi(apiClient);

// Date conversion utilities
const formatDateForAPI = (dateStr: string): string => {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
};

const formatDateForUI = (date: string | Date): string => {
    // Handle null/undefined
    if (!date) return '';

    // If it's a Date object, convert to YYYY-MM-DD string first
    let dateStr: string;
    if (date instanceof Date) {
        dateStr = date.toISOString().split('T')[0];
    } else if (typeof date === 'string') {
        dateStr = date;
    } else {
        dateStr = String(date);
    }

    // Convert YYYY-MM-DD to DD/MM/YYYY
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
};

// Type conversion helpers for ForgingInward
const convertToForgingInward = (inward: any): ForgingInward => ({
    id: inward.id,
    partyName: inward.partyName || '',
    challanNo: inward.challanNo || '',
    date: formatDateForUI(inward.date),
    weight: inward.weight || 0,
    weightUnit: inward.weightUnit,
    image: inward.image,
});

const convertToForgingInwardRequest = (data: Omit<ForgingInward, 'id'>): any => ({
    partyName: data.partyName,
    challanNo: data.challanNo,
    date: formatDateForAPI(data.date),
    weight: data.weight,
    weightUnit: data.weightUnit,
    image: data.image,
});

// Type conversion helpers for ForgingOutward
const convertToForgingOutward = (outward: any): ForgingOutward => ({
    id: outward.id,
    partyName: outward.partyName || '',
    challanNo: outward.challanNo || '',
    date: formatDateForUI(outward.date),
    weight: outward.weight || 0,
    weightUnit: outward.weightUnit,
    image: outward.image,
});

const convertToForgingOutwardRequest = (data: Omit<ForgingOutward, 'id'>): any => ({
    partyName: data.partyName,
    challanNo: data.challanNo,
    date: formatDateForAPI(data.date),
    weight: data.weight,
    weightUnit: data.weightUnit,
    image: data.image,
});

// Forging Inward API
export const forgingInwardApi = {
    // Get all forging inward records with optional date range
    getAll: (fromDate?: string, toDate?: string): Promise<ForgingInward[]> =>
        promisify<any>(cb =>
            generatedForgingInwardApi.searchForgingInwards({
                fromDate: fromDate ? formatDateForAPI(fromDate) : undefined,
                toDate: toDate ? formatDateForAPI(toDate) : undefined,
                page: 0,
                size: 1000, // Get all records
            }, cb)
        ).then(response => (response.content || []).map(convertToForgingInward)),

    // Create new forging inward record
    create: (data: Omit<ForgingInward, 'id'>): Promise<ForgingInward> =>
        promisify<any>(cb =>
            generatedForgingInwardApi.createForgingInward(convertToForgingInwardRequest(data), cb)
        ).then(convertToForgingInward),

    // Update existing forging inward record
    update: (id: number, data: Omit<ForgingInward, 'id'>): Promise<ForgingInward> =>
        promisify<any>(cb =>
            generatedForgingInwardApi.updateForgingInward(id, convertToForgingInwardRequest(data), cb)
        ).then(convertToForgingInward),

    // Delete forging inward record
    delete: (id: number): Promise<void> =>
        promisify<void>(cb => generatedForgingInwardApi.deleteForgingInward(id, cb)),
};

// Forging Outward API
export const forgingOutwardApi = {
    // Get all forging outward records with optional date range
    getAll: (fromDate?: string, toDate?: string): Promise<ForgingOutward[]> =>
        promisify<any>(cb =>
            generatedForgingOutwardApi.searchForgingOutwards({
                fromDate: fromDate ? formatDateForAPI(fromDate) : undefined,
                toDate: toDate ? formatDateForAPI(toDate) : undefined,
                page: 0,
                size: 1000, // Get all records
            }, cb)
        ).then(response => (response.content || []).map(convertToForgingOutward)),

    // Create new forging outward record
    create: (data: Omit<ForgingOutward, 'id'>): Promise<ForgingOutward> =>
        promisify<any>(cb =>
            generatedForgingOutwardApi.createForgingOutward(convertToForgingOutwardRequest(data), cb)
        ).then(convertToForgingOutward),

    // Update existing forging outward record
    update: (id: number, data: Omit<ForgingOutward, 'id'>): Promise<ForgingOutward> =>
        promisify<any>(cb =>
            generatedForgingOutwardApi.updateForgingOutward(id, convertToForgingOutwardRequest(data), cb)
        ).then(convertToForgingOutward),

    // Delete forging outward record
    delete: (id: number): Promise<void> =>
        promisify<void>(cb => generatedForgingOutwardApi.deleteForgingOutward(id, cb)),
};
