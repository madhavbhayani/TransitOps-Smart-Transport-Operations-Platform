import { apiClient } from '../api_client';

export const driverAPI = {
  getDrivers: async (filters = {}) => {
    const queryParams = new URLSearchParams();
    if (filters.search) queryParams.append('search', filters.search);
    if (filters.status) queryParams.append('status', filters.status);
    
    // We will use the search endpoint if there's a search term, else filter or list
    const endpoint = filters.search 
      ? `/drivers/search?${queryParams.toString()}` 
      : `/drivers/filter?${queryParams.toString()}`;
      
    return await apiClient(endpoint);
  },

  getDriverDetails: async (id) => {
    return await apiClient(`/drivers/${id}`);
  },

  getDriverStatusHistory: async (id) => {
    return await apiClient(`/drivers/${id}/status-history`);
  },

  getDriverSafetyHistory: async (id) => {
    return await apiClient(`/drivers/${id}/safety-history`);
  },

  createDriver: async (driverData) => {
    return await apiClient('/drivers', {
      method: 'POST',
      body: JSON.stringify(driverData),
    });
  },

  deleteDriver: async (id) => {
    return await apiClient(`/drivers/${id}`, {
      method: 'DELETE'
    });
  },

  updateDriver: async (id, driverData) => {
    return await apiClient(`/drivers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(driverData),
    });
  },

  updateSafetyScore: async (id, safetyScore, reason) => {
    return await apiClient(`/drivers/${id}/safety-score`, {
      method: 'POST',
      body: JSON.stringify({ safetyScore, reason }),
    });
  },

  updateDriverStatus: async (id, currentStatus, newStatus, reason = "Status updated via console") => {
    if (newStatus === 'AVAILABLE') {
      if (currentStatus === 'SUSPENDED') {
        return await apiClient(`/drivers/${id}/restore`, { method: 'POST', body: JSON.stringify({ reason }) });
      }
      return await apiClient(`/drivers/${id}/available`, { method: 'POST' });
    }
    if (newStatus === 'OFF_DUTY') {
      return await apiClient(`/drivers/${id}/off-duty`, { method: 'POST', body: JSON.stringify({ reason }) });
    }
    if (newStatus === 'SUSPENDED') {
      return await apiClient(`/drivers/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) });
    }
    throw new Error('Unsupported status transition');
  }
};
