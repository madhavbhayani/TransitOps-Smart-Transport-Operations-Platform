import { apiClient } from '../api_client';

export const tripAPI = {
  createTrip: async (data) => {
    return await apiClient('/trips', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateTrip: async (id, data) => {
    return await apiClient(`/trips/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },
  
  selectVehicles: async (data) => {
    return await apiClient('/trips/select-vehicles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  selectDrivers: async () => {
    return await apiClient('/trips/select-drivers', {
      method: 'POST',
      body: JSON.stringify({})
    });
  },
  
  getActiveTrips: async () => {
    return await apiClient('/trips/active', {
      method: 'POST',
      body: JSON.stringify({})
    });
  },
  
  searchTrips: async (data) => {
    return await apiClient('/trips/search', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  filterTrips: async (data) => {
    return await apiClient('/trips/filter', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  dispatchTrip: async (id) => {
    return await apiClient(`/trips/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  },
  
  completeTrip: async (id, data) => {
    return await apiClient(`/trips/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  cancelTrip: async (id, data) => {
    return await apiClient(`/trips/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  getTripDetails: async (id) => {
    return await apiClient(`/trips/${id}/details`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  exportData: async (filters = {}, format = 'csv') => {
    const token = localStorage.getItem('transitops_token');
    const query = new URLSearchParams({ format, ...filters }).toString();
    const response = await fetch(`http://localhost:6001/api/transitops/trips/export?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to export trips ${format.toUpperCase()}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trips_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};