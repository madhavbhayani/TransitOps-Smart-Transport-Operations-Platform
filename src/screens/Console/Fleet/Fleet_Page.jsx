import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, CheckCircle, Activity, AlertTriangle, Search, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { fleetAPI } from '../../../api_config/Fleet/Fleet_Api';

export default function FleetPage() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vehiclesRes, summaryRes] = await Promise.all([
        fleetAPI.getVehicles(statusFilter ? { status: statusFilter } : {}),
        fleetAPI.getFleetUtilizationSummary()
      ]);
      setVehicles(vehiclesRes.vehicles || []);
      setSummary(summaryRes.summary);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch fleet data');
    } finally {
      setLoading(false);
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.registration_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statsCards = summary ? [
    { label: 'Total Vehicles', value: summary.total_vehicles, icon: Truck, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { label: 'Available', value: summary.available_vehicles, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
    { label: 'On Trip', value: summary.on_trip_vehicles, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
    { label: 'In Shop (Maint.)', value: summary.in_shop_vehicles, icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' }
  ] : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Fleet Management</h1>
          <p className="text-muted">Monitor and manage all vehicles in your fleet.</p>
        </div>
        <button
          onClick={() => navigate('/console/fleet/new')}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary-500/20"
        >
          <Plus className="w-5 h-5" />
          Register Vehicle
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}



      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-surface-hover/30 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Search by registration or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="IN_SHOP">In Shop</option>
              <option value="RETIRED">Retired</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50 text-sm">
                <th className="p-4 font-semibold text-muted uppercase tracking-wider">Registration</th>
                <th className="p-4 font-semibold text-muted uppercase tracking-wider">Vehicle Details</th>
                <th className="p-4 font-semibold text-muted uppercase tracking-wider">Odometer</th>
                <th className="p-4 font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="p-4 font-semibold text-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-muted">Loading fleet...</td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-muted">No vehicles found.</td>
                </tr>
              ) : (
                filteredVehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-medium">{v.registration_number}</div>
                      <div className="text-xs text-muted">ID: {v.id}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{v.name}</div>
                      <div className="text-xs text-muted">{v.type} • {v.max_load_capacity} kg capacity</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{Number(v.odometer).toLocaleString()} km</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${v.status === 'AVAILABLE' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                          v.status === 'IN_SHOP' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50' :
                            v.status === 'ON_TRIP' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' :
                              'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                        }`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => navigate(`/console/fleet/${v.id}`)}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}