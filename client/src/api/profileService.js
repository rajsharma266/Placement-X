import apiClient from './client';

const request = async (method, url, payload) => (await apiClient[method](url, payload)).data.data;
export const getProfile = () => request('get', '/profile');
export const updateProfile = (payload) => request('put', '/profile', payload);
export const getProfileCompletion = () => request('get', '/profile/completion');
