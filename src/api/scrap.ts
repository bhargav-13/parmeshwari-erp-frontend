import { apiClient } from './client';

// Kevin Scrap Types
export interface KevinScrapContractor {
    scrapContractorId: number;
    name: string;
}

export interface KevinScrapRequest {
    scrapContractorId: number;
    challanNo: string;
    orderDate: string;
    item: string;
    elementValue: number;
    elementType: 'FOAM' | 'BAG' | 'PETI' | 'DRUM' | 'OTHER';
    totalWeight: number;
    outWeight: number;
    netWeight: number;
}

export interface KevinScrap {
    scrapId: number;
    contractor: KevinScrapContractor;
    challanNo: string;
    orderDate: string;
    item: string;
    elementValue: number;
    elementType: 'FOAM' | 'BAG' | 'PETI' | 'DRUM' | 'OTHER';
    totalWeight: number;
    outWeight: number;
    netWeight: number;
    createdAt: string;
    lastUpdatedAt: string;
}

export interface PaginatedKevinScrap {
    data: KevinScrap[];
    empty: boolean;
    last: boolean;
    first: boolean;
    totalPages: number;
    totalElements: number;
    size: number;
}

// Jayesh Scrap Types
export interface JayeshScrapContractor {
    scrapContractorId: number;
    name: string;
}

export interface JayeshScrapRequest {
    scrapContractorId: number;
    challanNo: string;
    orderDate: string;
    item: string;
    elementValue: number;
    elementType: 'FOAM' | 'BAG' | 'PETI' | 'DRUM' | 'OTHER';
    totalWeight: number;
    outWeight: number;
    netWeight: number;
    rate: number;
}

export interface JayeshScrap {
    scrapId: number;
    contractor: JayeshScrapContractor;
    challanNo: string;
    orderDate: string;
    item: string;
    elementValue: number;
    elementType: 'FOAM' | 'BAG' | 'PETI' | 'DRUM' | 'OTHER';
    totalWeight: number;
    outWeight: number;
    netWeight: number;
    rate: number;
    createdAt: string;
    lastUpdatedAt: string;
}

export interface PaginatedJayeshScrap {
    data: JayeshScrap[];
    empty: boolean;
    last: boolean;
    first: boolean;
    totalPages: number;
    totalElements: number;
    size: number;
}

// Kevin Scrap API
export const kevinScrapApi = {
    // Contractor operations
    getContractorList: async (): Promise<KevinScrapContractor[]> => {
        const response = await apiClient.get<KevinScrapContractor[]>('/api/v1/kevin/scrap-contractor');
        return response.data;
    },

    addContractor: async (name: string): Promise<KevinScrapContractor> => {
        const response = await apiClient.post<KevinScrapContractor>('/api/v1/kevin/scrap-contractor', { name });
        return response.data;
    },

    getContractorById: async (id: number): Promise<KevinScrapContractor> => {
        const response = await apiClient.get<KevinScrapContractor>(`/api/v1/kevin/scrap-contractor/${id}`);
        return response.data;
    },

    // Scrap operations
    addScrap: async (data: KevinScrapRequest): Promise<KevinScrap> => {
        const response = await apiClient.post<KevinScrap>('/api/v1/kevin/scrap', data);
        return response.data;
    },

    getScrapList: async (params: {
        page?: number;
        size?: number;
        search?: string;
        sortByFields?: string;
        direction?: 'ASC' | 'DESC';
    }): Promise<PaginatedKevinScrap> => {
        const response = await apiClient.get<PaginatedKevinScrap>('/api/v1/kevin/scrap', { params });
        return response.data;
    },

    getScrapById: async (id: number): Promise<KevinScrap> => {
        const response = await apiClient.get<KevinScrap>(`/api/v1/kevin/scrap/${id}`);
        return response.data;
    },

    updateScrap: async (id: number, data: KevinScrapRequest): Promise<KevinScrap> => {
        const response = await apiClient.put<KevinScrap>(`/api/v1/kevin/scrap/${id}`, data);
        return response.data;
    },

    deleteScrap: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/v1/kevin/scrap/${id}`);
    },
};

// Jayesh Scrap API
export const jayeshScrapApi = {
    // Contractor operations
    getContractorList: async (): Promise<JayeshScrapContractor[]> => {
        const response = await apiClient.get<JayeshScrapContractor[]>('/api/v1/jayesh/scrap-contractor');
        return response.data;
    },

    addContractor: async (name: string): Promise<JayeshScrapContractor> => {
        const response = await apiClient.post<JayeshScrapContractor>('/api/v1/jayesh/scrap-contractor', { name });
        return response.data;
    },

    getContractorById: async (id: number): Promise<JayeshScrapContractor> => {
        const response = await apiClient.get<JayeshScrapContractor>(`/api/v1/jayesh/scrap-contractor/${id}`);
        return response.data;
    },

    // Scrap operations
    addScrap: async (data: JayeshScrapRequest): Promise<JayeshScrap> => {
        const response = await apiClient.post<JayeshScrap>('/api/v1/jayesh/scrap', data);
        return response.data;
    },

    getScrapList: async (params: {
        page?: number;
        size?: number;
        search?: string;
        sortByFields?: string;
        direction?: 'ASC' | 'DESC';
    }): Promise<PaginatedJayeshScrap> => {
        const response = await apiClient.get<PaginatedJayeshScrap>('/api/v1/jayesh/scrap', { params });
        return response.data;
    },

    getScrapById: async (id: number): Promise<JayeshScrap> => {
        const response = await apiClient.get<JayeshScrap>(`/api/v1/jayesh/scrap/${id}`);
        return response.data;
    },

    updateScrap: async (id: number, data: JayeshScrapRequest): Promise<JayeshScrap> => {
        const response = await apiClient.put<JayeshScrap>(`/api/v1/jayesh/scrap/${id}`, data);
        return response.data;
    },

    deleteScrap: async (id: number): Promise<void> => {
        await apiClient.delete(`/api/v1/jayesh/scrap/${id}`);
    },
};
