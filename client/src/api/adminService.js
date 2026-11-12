import apiClient from './client';
const data = async (request) => (await request).data.data;
export const getAdminAnalytics = () => data(apiClient.get('/admin/analytics'));
export const getAdminUsers = (params) => data(apiClient.get('/admin/users', { params }));
export const deactivateAdminUser = (id) => data(apiClient.patch(`/admin/users/${id}/deactivate`));
export const getAdminContent = (resource, params) => data(apiClient.get(`/admin/${resource}`, { params }));
export const createAdminContent = (resource, payload) => data(apiClient.post(`/admin/${resource}`, payload));
export const updateAdminContent = (resource, id, payload) => data(apiClient.put(`/admin/${resource}/${id}`, payload));
export const deactivateAdminContent = (resource, id) => data(apiClient.patch(`/admin/${resource}/${id}/deactivate`));
