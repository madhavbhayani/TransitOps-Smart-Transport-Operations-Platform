import { apiClient } from '../api_client';

export const loginAPI = async (email, password) => {
  return await apiClient('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
};
