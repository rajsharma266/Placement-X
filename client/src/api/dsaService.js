import apiClient from './client';
const data = async (request) => (await request).data.data;
export const getDsaQuestions = (params) => data(apiClient.get('/dsa/questions', { params }));
export const getDsaQuestion = (identifier) => data(apiClient.get(`/dsa/questions/${identifier}`));
export const getDsaProgress = () => data(apiClient.get('/dsa/progress'));
export const updateDsaProgress = (id, payload) => data(apiClient.put(`/dsa/questions/${id}/progress`, payload));
export const executeDsaCode = (id, mode, payload) => data(apiClient.post(`/dsa/questions/${id}/${mode}`, payload));
