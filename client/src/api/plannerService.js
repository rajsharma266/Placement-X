import apiClient from './client';
const data = async (request) => (await request).data.data;
export const getTodayPlan = () => data(apiClient.get('/planner/today'));
export const generatePlan = (body) => data(apiClient.post('/planner/generate', body));
export const updatePlannerTask = (id, completed) => data(apiClient.patch(`/planner/tasks/${id}`, { completed }));
export const getPlannerWeek = () => data(apiClient.get('/planner/week'));
