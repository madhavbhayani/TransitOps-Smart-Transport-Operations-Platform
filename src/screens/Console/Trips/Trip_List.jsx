import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { citiesByState } from '../../../assets/Cities by State Data/citiesData';
import { tripAPI } from '../../../api_config/Trips/Trip_api_service';
import { Truck, MapPin, Navigation, Plus, Search, Filter, AlertCircle, X, Check, DollarSign, Weight, FileText } from 'lucide-react';

const allCities = Object.entries(citiesByState).flatMap(([state, cities]) => cities.map(c => `${c}, ${state}`));

const TripList = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [formData, setFormData] = useState({
    source: '', destination: '', cargoWeight: '', plannedDistance: '', revenue: '',
    vehicleId: '', driverId: ''
  });
  const [eligibleVehicles, setEligibleVehicles] = useState([]);
  const [eligibleDrivers, setEligibleDrivers] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let response;
      if (searchTerm) {
        response = await tripAPI.searchTrips({ search: searchTerm });
      } else {
        response = await tripAPI.filterTrips(filterStatus ? { status: filterStatus } : {});
      }
      setTrips(response.trips || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch trips');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterStatus]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleNextStep = async () => {
    if (createStep === 1) {
      if (!formData.source || !formData.destination || !formData.cargoWeight || !formData.plannedDistance || !formData.revenue) {
        setSubmitError("Please fill all fields.");
        return;
      }
      setSubmitError(null);
      setLoadingResources(true);
      try {
        const [vehRes, drvRes] = await Promise.all([
          tripAPI.selectVehicles({ cargoWeight: parseFloat(formData.cargoWeight) }),
          tripAPI.selectDrivers()
        ]);
        setEligibleVehicles(vehRes.vehicles || []);
        setEligibleDrivers(drvRes.drivers || []);
        setCreateStep(2);
      } catch (err) {
        setSubmitError(err.message || 'Failed to fetch available resources');
      } finally {
        setLoadingResources(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.vehicleId || !formData.driverId) {
      setSubmitError("Please select both a vehicle and a driver.");
      return;
    }
    setLoadingResources(true);
    setSubmitError(null);
    try {
      await tripAPI.createTrip({
        ...formData,
        cargoWeight: parseFloat(formData.cargoWeight),
        plannedDistance: parseFloat(formData.plannedDistance),
        revenue: parseFloat(formData.revenue),
        vehicleId: parseInt(formData.vehicleId, 10),
        driverId: parseInt(formData.driverId, 10)
      });
      setShowCreateModal(false);
      setCreateStep(1);
      setFormData({ source: '', destination: '', cargoWeight: '', plannedDistance: '', revenue: '', vehicleId: '', driverId: '' });
      fetchTrips();
    } catch (err) {
      setSubmitError(err.message || 'Failed to create trip');
    } finally {
      setLoadingResources(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
      case 'DISPATCHED': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'COMPLETED': return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'CANCELLED': return 'bg-red-500/20 text-red-400 border border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <datalist id="cities-list">
        {allCities.map((city, idx) => (
          <option key={idx} value={city} />
        ))}
      </datalist>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Trip Management</h1>
          <p className="text-muted">Draft, dispatch, and track fleet trips globally.</p>
        </div>
        
        <button 
          onClick={() => { setShowCreateModal(true); setCreateStep(1); setSubmitError(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl shadow-lg shadow-primary-500/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create New Trip
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/50">
          {error}
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted" />
            </div>
            <input
              type="text"
              placeholder="Search by source or destination..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-muted" />
            </div>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all appearance-none"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>



      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-hover text-muted uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Route</th>
                <th className="px-6 py-4 font-medium">Driver / Vehicle</th>
                <th className="px-6 py-4 font-medium">Details</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
              <tbody className="divide-y divide-border">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-muted">
                      No trips found. Create one to get started!
                    </td>
                  </tr>
                ) : (
                  trips.map(trip => (
                    <tr key={trip.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2 font-semibold text-foreground">
                          <MapPin className="w-4 h-4 text-primary-500" />
                          <span>{trip.source}</span>
                          <span className="text-muted mx-2">→</span>
                          <span>{trip.destination}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{trip.driver_name || `Driver #${trip.driver_id}`}</div>
                        <div className="text-sm text-muted">{trip.vehicle_registration || `Vehicle #${trip.vehicle_id}`}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{trip.planned_distance} km</div>
                        <div className="text-sm text-green-400 font-medium">₹{parseFloat(trip.revenue).toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          trip.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                          trip.status === 'CANCELLED' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                          trip.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' :
                          'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                        }`}>
                          {trip.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/console/trips/${trip.id}`}
                          className="p-1.5 text-muted hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors inline-block"
                          title="View Details"
                        >
                          <FileText className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
      )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/50">
              <h2 className="text-xl font-bold tracking-tight">Draft New Trip</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted hover:text-foreground" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {submitError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  {submitError}
                </div>
              )}
              
              {/* Stepper */}
              <div className="flex items-center mb-8">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${createStep >= 1 ? 'bg-primary-500 text-black' : 'bg-background border border-border text-muted'}`}>1</div>
                <div className={`flex-1 h-1 mx-2 rounded-full ${createStep >= 2 ? 'bg-primary-500' : 'bg-border'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${createStep >= 2 ? 'bg-primary-500 text-black' : 'bg-background border border-border text-muted'}`}>2</div>
              </div>

              {createStep === 1 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">Source</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input list="cities-list" type="text" name="source" value={formData.source} onChange={handleInputChange} required
                          className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Origin City" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">Destination</label>
                      <div className="relative">
                        <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input list="cities-list" type="text" name="destination" value={formData.destination} onChange={handleInputChange} required
                          className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Dest. City" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-5">
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">Cargo Weight (kg)</label>
                      <div className="relative">
                        <Weight className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input type="number" name="cargoWeight" value={formData.cargoWeight} onChange={handleInputChange} required min="0"
                          className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. 5000" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">Distance (km)</label>
                      <div className="relative">
                        <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input type="number" name="plannedDistance" value={formData.plannedDistance} onChange={handleInputChange} required min="0"
                          className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. 350" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted mb-1.5">Revenue (₹)</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                        <input type="number" name="revenue" value={formData.revenue} onChange={handleInputChange} required min="0"
                          className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. 2500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {createStep === 2 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-muted mb-1.5">Select Eligible Vehicle (Min {formData.cargoWeight}kg Capacity)</label>
                    <select name="vehicleId" value={formData.vehicleId} onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                    >
                      <option value="">-- Choose a Vehicle --</option>
                      {eligibleVehicles.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.registration_number} - {v.name} (Cap: {v.max_load_capacity}kg)
                        </option>
                      ))}
                    </select>
                    {eligibleVehicles.length === 0 && <p className="text-red-400 text-xs mt-2">No available vehicles can handle this load.</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-muted mb-1.5">Select Eligible Driver (Valid License)</label>
                    <select name="driverId" value={formData.driverId} onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary-500 outline-none appearance-none"
                    >
                      <option value="">-- Choose a Driver --</option>
                      {eligibleDrivers.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.name} (License: {d.license_number})
                        </option>
                      ))}
                    </select>
                    {eligibleDrivers.length === 0 && <p className="text-red-400 text-xs mt-2">No available drivers found.</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-border bg-background/50 flex justify-end space-x-3">
              <button 
                onClick={() => {
                  if (createStep === 2) setCreateStep(1);
                  else setShowCreateModal(false);
                }} 
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-white/5 transition-colors"
                disabled={loadingResources}
              >
                {createStep === 2 ? 'Back' : 'Cancel'}
              </button>
              <button 
                onClick={createStep === 1 ? handleNextStep : handleSubmit}
                className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-black rounded-lg text-sm font-semibold transition-all flex items-center disabled:opacity-50"
                disabled={loadingResources}
              >
                {loadingResources ? 'Loading...' : (createStep === 1 ? 'Next Step' : 'Draft Trip')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TripList;
