import { apiClient } from '../api_client';

export const analyticsAPI = {
  getOverview: async () => {
    return await apiClient('/analytics/overview');
  },
  
  getFuelEfficiency: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return await apiClient(`/analytics/fuel-efficiency?${query}`);
  },

  getFleetUtilization: async () => {
    return await apiClient('/analytics/fleet-utilization');
  },

  getOperationalCost: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return await apiClient(`/analytics/operational-cost?${query}`);
  },

  getVehicleROI: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return await apiClient(`/analytics/vehicle-roi?${query}`);
  },

  getTopCostliestVehicles: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return await apiClient(`/analytics/top-costliest-vehicles?${query}`);
  },

  getMonthlyRevenue: async (year) => {
    const query = year ? `?year=${year}` : '';
    return await apiClient(`/analytics/monthly-revenue${query}`);
  },

  getMonthlyProfitability: async (year) => {
    const query = year ? `?year=${year}` : '';
    return await apiClient(`/analytics/monthly-profitability${query}`);
  },

  getTripProfitability: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return await apiClient(`/analytics/trips/profitability?${query}`);
  },

  getSpecificTripAnalytics: async (tripId) => {
    return await apiClient(`/analytics/trips/${tripId}`);
  },

  exportCSV: async (type, filters = {}) => {
    const token = localStorage.getItem('transitops_token');
    const query = new URLSearchParams({ type, ...filters }).toString();
    const response = await fetch(`http://localhost:6001/api/transitops/analytics/export/csv?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to export analytics CSV');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics_${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};
