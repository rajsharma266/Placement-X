import apiClient from '../../api/client';

const request = async (method, url, payload) => (await apiClient[method](url, payload)).data.data;
export const register = (payload) => request('post', '/auth/register', payload);
export const login = (payload) => request('post', '/auth/login', payload);
export const logout = () => request('post', '/auth/logout');
export const getCurrentUser = () => request('get', '/auth/me');
