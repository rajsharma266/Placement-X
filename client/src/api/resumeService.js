import apiClient from './client';
const data = async (request) => (await request).data.data;
export const analyzeResume = (file) => { const body = new FormData(); body.append('resume', file); return data(apiClient.post('/resumes/analyze', body, { headers: { 'Content-Type': 'multipart/form-data' } })); };
export const getResumeHistory = (params) => data(apiClient.get('/resumes', { params }));
export const getResumeAnalysis = (id) => data(apiClient.get(`/resumes/${id}`));
export const getResumeComparison = (id) => data(apiClient.get(`/resumes/${id}/comparison`));
export const deleteResumeAnalysis = (id) => data(apiClient.delete(`/resumes/${id}`));
