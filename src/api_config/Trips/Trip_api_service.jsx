import { apiClient } from '../api_client';

export const tripAPI = {
  createTrip: async (data) => {
    return await apiClient('/trips', {
      method: 'POST',
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
  }
};