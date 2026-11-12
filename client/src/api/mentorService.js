import apiClient from './client';
export const getMentorPrompts = async () => (await apiClient.get('/mentor/starter-prompts')).data.data;
export const chatWithMentor = async (message) => (await apiClient.post('/mentor/chat', { message })).data.data;
