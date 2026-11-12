import apiClient from './client';

export const getDashboard = async () => (await apiClient.get('/dashboard')).data.data;
