import apiClient from './client';
const data = async (request) => (await request).data.data;
export const getCompanies = (params) => data(apiClient.get('/companies', { params }));
export const getCompany = (slug) => data(apiClient.get(`/companies/${slug}`));
export const getCompanyReadiness = (slug) => data(apiClient.get(`/companies/${slug}/readiness`));
