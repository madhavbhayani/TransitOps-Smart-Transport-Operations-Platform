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
    return await apiClient(`/maintenance${query ? `?${query}` : ''}`);
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
  },

  exportMaintenanceData: async (filters = {}, format = 'csv') => {
    const token = localStorage.getItem('transitops_token');
    const query = new URLSearchParams({ format, ...filters }).toString();
    const response = await fetch(`http://localhost:6001/api/transitops/maintenance/export?${query}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to export maintenance ${format.toUpperCase()}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};