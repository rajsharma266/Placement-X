import apiClient from './client';
export const getIntelligence = async () => (await apiClient.get('/intelligence')).data.data;
export const getIntelligenceTrends = async () => (await apiClient.get('/intelligence/trends')).data.data;
