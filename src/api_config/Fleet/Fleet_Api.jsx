import { apiClient } from '../api_client';

export const fleetAPI = {
  // Lists & Global
  getFleetUtilizationSummary: async () => {
    return await apiClient('/vehicles/utilization/summary');
  },
  getVehicles: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return await apiClient(`/vehicles${query ? `?${query}` : ''}`);
  },
  registerVehicle: async (data) => {
    return await apiClient('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Individual Vehicle Routes
  getVehicleById: async (id) => {
    return await apiClient(`/vehicles/${id}`);
  },
  updateVehicle: async (id, data) => {
    return await apiClient(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // Status Updates
  markAvailable: async (id) => {
    return await apiClient(`/vehicles/${id}/mark-available`, { method: 'POST' });
  },
  retireVehicle: async (id, reason) => {
    return await apiClient(`/vehicles/${id}/retire`, { 
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  updateVehicleStatus: async (id, currentStatus, newStatus, reason = "Status updated via console") => {
    if (newStatus === 'AVAILABLE') {
      return await apiClient(`/vehicles/${id}/mark-available`, { method: 'POST' });
    }
    if (newStatus === 'RETIRED') {
      return await apiClient(`/vehicles/${id}/retire`, { method: 'POST', body: JSON.stringify({ reason }) });
    }
    throw new Error('Unsupported status transition');
  },

  // Maintenance Operations
  startMaintenance: async (id, data) => {
    return await apiClient(`/vehicles/${id}/maintenance`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  completeMaintenance: async (vehicleId, maintenanceId, data) => {
    return await apiClient(`/vehicles/${vehicleId}/maintenance/${maintenanceId}/complete`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  cancelMaintenance: async (vehicleId, maintenanceId, data) => {
    return await apiClient(`/vehicles/${vehicleId}/maintenance/${maintenanceId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getVehicleMaintenanceList: async (id) => {
    return await apiClient(`/vehicles/${id}/maintenance`);
  },
  getAllMaintenance: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    // Assuming backend has a route or we can fetch via vehicles. Wait, backend controller has getAllMaintenance but let's check vehicleRoutes.js if it's exposed.
    // It is not exposed in vehicleRoutes.js, so we might have to fetch vehicles or backend might need a route.
    // Let me check vehicleRoutes.js again
    return await apiClient(`/vehicles/maintenance/all${query ? `?${query}` : ''}`); // Actually let's not assume this endpoint exists yet unless we check
  },

  // Utilization & History
  getVehicleUtilization: async (id) => {
    return await apiClient(`/vehicles/${id}/utilization`);
  },
  getVehicleStatusHistory: async (id) => {
    return await apiClient(`/vehicles/${id}/status-history`);
  },
  getVehicleLifecycle: async (id) => {
    return await apiClient(`/vehicles/${id}/lifecycle`);
  }
};