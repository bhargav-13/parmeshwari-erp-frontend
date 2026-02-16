import { apiClient } from './client';

export const electricApi = {
    // Download Electric report PDF
    downloadElectricPdf: async (tab: 'OUTWARDS' | 'CREDIT', search?: string): Promise<Blob> => {
        const params: any = { tab };
        if (search) {
            params.search = search;
        }

        const response = await apiClient.get('/api/v1/electric/report/pdf', {
            params,
            responseType: 'blob',
        });
        return response.data;
    },

    // Note: Add other CRUD methods if needed by backend later
};
