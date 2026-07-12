import { apiClient } from '../api_client';

export const financeAPI = {
  // Fuel Logs
  recordFuelLog: async (data) => {
    return await apiClient('/finance/fuel-logs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getFuelLogs: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return await apiClient(`/finance/fuel-logs${query ? `?${query}` : ''}`);
  },
  getFuelLogDetails: async (id) => {
    return await apiClient(`/finance/fuel-logs/${id}`);
  },
  voidFuelLog: async (id, reason) => {
    return await apiClient(`/finance/fuel-logs/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // Expenses
  recordExpense: async (data) => {
    return await apiClient('/finance/expenses', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  getExpenses: async (filters = {}) => {
    const query = new URLSearchParams(filters).toString();
    return await apiClient(`/finance/expenses${query ? `?${query}` : ''}`);
  },
  getExpenseDetails: async (id) => {
    return await apiClient(`/finance/expenses/${id}`);
  },
  voidExpense: async (id, reason) => {
    return await apiClient(`/finance/expenses/${id}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  },

  // Analytics
  getDashboardSummary: async () => {
    return await apiClient('/finance/summary');
  },
  getVehicleSummary: async (vehicleId) => {
    return await apiClient(`/finance/vehicles/${vehicleId}/summary`);
  },
  
  // Search
  searchFinancials: async (searchTerm) => {
    return await apiClient(`/finance/search?search=${encodeURIComponent(searchTerm)}`);
  },
  
  // Export
  exportData: async (type, format = 'csv') => {
    const token = localStorage.getItem('transitops_token');
    const response = await fetch(`http://localhost:6001/api/transitops/finance/export?type=${type}&format=${format}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to export ${format.toUpperCase()}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finance_${type}_export_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  }
};
