import { apiClient } from '../api_client';
import { analyticsAPI } from '../Analytics/analytics_api_service';

export const dashboardAPI = {
  getStats: async () => {
    const response = await apiClient('/dashboard/stats');
    return response.data; // { activeVehicles, activeTrips, currentMaintenance, alerts }
  },

  getOperationalCostChart: async () => {
    try {
      return await analyticsAPI.getOperationalCost({});
    } catch (err) {
      if (err.message && err.message.includes('Forbidden')) {
        return null;
      }
      throw err;
    }
  },

  getMonthlyProfitabilityChart: async () => {
    try {
      const year = new Date().getFullYear().toString();
      return await analyticsAPI.getMonthlyProfitability(year);
    } catch (err) {
      if (err.message && err.message.includes('Forbidden')) {
        return null;
      }
      throw err;
    }
  }
};
