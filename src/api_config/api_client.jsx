const BASE_URL = 'http://localhost:6001/api/transitops';

export const apiClient = async (endpoint, options = {}) => {
  const token = localStorage.getItem('transitops_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();
  
  if (!response.ok || (data && data.success === false)) {
    throw new Error(data.message || 'API request failed');
  }
  
  return data;
};
