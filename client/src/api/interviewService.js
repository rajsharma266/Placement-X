import apiClient from './client';
const data = async (request) => (await request).data.data;
export const createInterview = (payload) => data(apiClient.post('/interviews', payload));
export const getInterviewHistory = (params) => data(apiClient.get('/interviews/history', { params }));
export const getInterview = (id) => data(apiClient.get(`/interviews/${id}`));
export const saveInterviewAnswers = (id, answers) => data(apiClient.post(`/interviews/${id}/answers`, { answers }));
export const completeInterview = (id) => data(apiClient.post(`/interviews/${id}/complete`));
