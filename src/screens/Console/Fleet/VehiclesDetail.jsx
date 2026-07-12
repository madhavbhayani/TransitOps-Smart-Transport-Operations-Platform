import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, AlertTriangle, Activity, Settings, Calendar, LineChart, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';
import { fleetAPI } from '../../../api_config/Fleet/Fleet_Api';

export default function VehiclesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [vehicle, setVehicle] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [lifecycle, setLifecycle] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyFilterDate, setHistoryFilterDate] = useState('');

  useEffect(() => {
    fetchVehicleAndHistory();
  }, [id]);

  const fetchVehicleAndHistory = async () => {
    setLoading(true);
    try {
      const [vehicleRes, statusRes, lifecycleRes] = await Promise.all([
        fleetAPI.getVehicleById(id),
        fleetAPI.getVehicleStatusHistory(id),
        fleetAPI.getVehicleLifecycle(id)
      ]);
      setVehicle(vehicleRes.vehicle);
      setStatusHistory(statusRes.history || []);
      setLifecycle(lifecycleRes.lifecycle || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch vehicle details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === vehicle.status || newStatus === 'ON_TRIP' || newStatus === 'IN_SHOP') return;

    const reason = window.prompt(`Please provide a reason for changing status to ${newStatus}:`, 'Status updated via console');
    if (reason === null) return; 

    try {
      await fleetAPI.updateVehicleStatus(id, vehicle.status, newStatus, reason);
      fetchVehicleAndHistory();
    } catch (err) {
      alert(err.message || 'Failed to update vehicle status');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted">Loading vehicle details...</div>;
  }

  if (error || !vehicle) {
    return (
      <div className="p-8 text-center text-red-500">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
        <p>{error || 'Vehicle not found'}</p>
        <button onClick={() => navigate('/console/fleet')} className="mt-4 text-primary-600 underline">
          Go back to Fleet
        </button>
      </div>
    );
  }

  const { utilization } = vehicle;

  const filterByDate = (historyArray, dateField) => {
    if (!historyFilterDate) return historyArray;
    return historyArray.filter(item => {
      const itemDate = new Date(item[dateField]).toISOString().split('T')[0];
      return itemDate === historyFilterDate;
    });
  };

  const filteredStatusHistory = filterByDate(statusHistory, 'created_at');
  const filteredLifecycle = filterByDate(lifecycle, 'event_date');

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
      <button 
        onClick={() => navigate('/console/fleet')}
        className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Fleet
      </button>

      {/* Hero Section */}
      <div className="bg-surface border border-border rounded-2xl shadow-sm p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Truck className="w-12 h-12" />
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">{vehicle.name}</h1>
                <p className="text-muted mb-4">Registration: <span className="font-mono font-medium text-foreground">{vehicle.registration_number}</span></p>
                
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    vehicle.status === 'AVAILABLE' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                    vehicle.status === 'IN_SHOP' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50' :
                    vehicle.status === 'ON_TRIP' ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' :
                    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }`}>
                    {vehicle.status}
                  </span>
                  
                  {vehicle.status !== 'ON_TRIP' && vehicle.status !== 'IN_SHOP' && (
                    <select 
                      value={vehicle.status}
                      onChange={handleStatusChange}
                      className="ml-4 px-3 py-1 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    >
                      <option value="AVAILABLE">Mark Available</option>
                      <option value="RETIRED">Retire Vehicle</option>
                    </select>
                  )}
                  {vehicle.status === 'ON_TRIP' && (
                    <span className="ml-4 text-xs text-muted">(Status managed automatically by trips)</span>
                  )}
                  {vehicle.status === 'IN_SHOP' && (
                    <span className="ml-4 text-xs text-muted">(Status managed by maintenance module)</span>
                  )}
                </div>
              </div>
              
              <div className="mt-6 sm:mt-0 p-4 border border-border rounded-xl bg-background/50 text-right">
                <div className="flex items-center justify-end gap-2 mb-2 text-primary-600">
                  <Activity className="w-5 h-5" />
                  <span className="font-semibold text-lg">{Number(vehicle.odometer).toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted uppercase tracking-wider">Total Odometer (km)</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-10 border-t border-border pt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Vehicle Type</h3>
            <p className="font-medium text-foreground">{vehicle.type}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Load Capacity</h3>
            <p className="font-medium text-foreground">{vehicle.max_load_capacity} kg</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Acquisition Cost</h3>
            <p className="font-medium text-foreground">${Number(vehicle.acquisition_cost).toLocaleString()}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-2">Registered On</h3>
            <p className="font-medium text-foreground">{new Date(vehicle.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Utilization Metrics */}
      {utilization && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><LineChart className="w-5 h-5 text-primary-600" /> Utilization Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-sm font-medium text-muted mb-1">Total Trips Completed</p>
              <h3 className="text-3xl font-bold">{utilization.completed_trips} <span className="text-lg text-muted font-normal">/ {utilization.total_trips}</span></h3>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-sm font-medium text-muted mb-1">Total Distance Driven</p>
              <h3 className="text-3xl font-bold">{Number(utilization.total_distance).toLocaleString()} <span className="text-lg text-muted font-normal">km</span></h3>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-sm font-medium text-muted mb-1">Operational Hours</p>
              <h3 className="text-3xl font-bold">{Number(utilization.total_operational_hours).toLocaleString()} <span className="text-lg text-muted font-normal">hrs</span></h3>
            </div>
          </div>
        </div>
      )}

      {/* History Sections */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border pt-8">
        <h2 className="text-2xl font-bold">Audit & Lifecycle Logs</h2>
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-muted" />
          <input 
            type="date" 
            value={historyFilterDate}
            onChange={(e) => setHistoryFilterDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {historyFilterDate && (
            <button 
              onClick={() => setHistoryFilterDate('')}
              className="text-sm text-primary-600 hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Status History */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-surface-hover/50 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold">Status History</h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            {filteredStatusHistory.length === 0 ? (
              <div className="p-8 text-center text-muted">No status history found.</div>
            ) : (
              <div className="divide-y divide-border">
                {filteredStatusHistory.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-surface-hover/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {item.previous_status ? (
                          <>
                            <span className="text-muted">{item.previous_status}</span>
                            <span>→</span>
                          </>
                        ) : null}
                        <span className="text-foreground">{item.new_status}</span>
                      </div>
                      <div className="text-xs text-muted text-right">
                        {new Date(item.created_at).toLocaleDateString()}<br/>
                        {new Date(item.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-sm text-muted">
                      <span className="font-medium">Reason:</span> {item.reason || 'None provided'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Lifecycle Events */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-surface-hover/50 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold">Lifecycle Events</h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            {filteredLifecycle.length === 0 ? (
              <div className="p-8 text-center text-muted">No lifecycle events found.</div>
            ) : (
              <div className="divide-y divide-border">
                {filteredLifecycle.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-surface-hover/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-bold text-primary-600">
                        {item.event_type.replace('_', ' ')}
                      </div>
                      <div className="text-xs text-muted text-right">
                        {new Date(item.event_date).toLocaleDateString()}<br/>
                        {new Date(item.event_date).toLocaleTimeString()}
                      </div>
                    </div>
                    <div className="text-sm text-foreground">
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}