import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { tripAPI } from '../../../api_config/Trips/Trip_api_service';
import { MapPin, Navigation, ArrowLeft, CheckCircle, XCircle, Play, AlertCircle, Clock, Truck, User, X } from 'lucide-react';

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [completeData, setCompleteData] = useState({ finalOdometer: '', fuelConsumed: '' });
  const [cancelReason, setCancelReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchTripDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await tripAPI.getTripDetails(id);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch trip details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTripDetails();
  }, [fetchTripDetails]);

  const handleDispatch = async () => {
    try {
      setProcessing(true);
      setActionError(null);
      await tripAPI.dispatchTrip(id);
      await fetchTripDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to dispatch trip');
    } finally {
      setProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!completeData.finalOdometer || !completeData.fuelConsumed) {
      setActionError("Please fill all fields.");
      return;
    }
    try {
      setProcessing(true);
      setActionError(null);
      await tripAPI.completeTrip(id, {
        finalOdometer: parseFloat(completeData.finalOdometer),
        fuelConsumed: parseFloat(completeData.fuelConsumed)
      });
      setShowCompleteModal(false);
      await fetchTripDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to complete trip');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason) {
      setActionError("Please provide a reason.");
      return;
    }
    try {
      setProcessing(true);
      setActionError(null);
      await tripAPI.cancelTrip(id, { reason: cancelReason });
      setShowCancelModal(false);
      await fetchTripDetails();
    } catch (err) {
      setActionError(err.message || 'Failed to cancel trip');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          {error}
        </div>
      </div>
    );
  }

  const { trip, vehicle, driver, history } = data || {};
  if (!trip) return <div className="p-8 text-center">Trip not found.</div>;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full space-y-8"
    >
      <button 
        onClick={() => navigate('/console/trips')}
        className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Trips
      </button>


        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold font-bricolage tracking-tight flex items-center gap-3">
              Trip #{trip.id}
              <span className={`px-3 py-1 text-sm rounded-full font-medium ${
                trip.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                trip.status === 'CANCELLED' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                trip.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' :
                'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              }`}>
                {trip.status}
              </span>
            </h1>
            <p className="text-muted mt-1">Created on {new Date(trip.created_at).toLocaleString()}</p>
          </div>
        </div>

      {actionError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          {actionError}
        </div>
      )}

      {/* Hero Route Card */}
      <div className="bg-gradient-to-r from-surface to-surface/40 border border-border rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Navigation className="w-48 h-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div>
            <div className="text-sm font-medium text-muted uppercase tracking-wider mb-2">Origin</div>
            <div className="text-2xl font-semibold flex items-center">
              <MapPin className="w-6 h-6 text-primary-500 mr-2" />
              {trip.source}
            </div>
          </div>
          <div className="flex flex-col justify-center items-center">
            <div className="text-sm text-muted font-medium mb-2">{parseFloat(trip.planned_distance).toLocaleString()} km</div>
            <div className="w-full flex items-center">
              <div className="h-0.5 w-full bg-border rounded-full relative">
                <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary-500 shadow-[0_0_10px_rgba(255,165,0,0.5)] ${trip.status === 'COMPLETED' ? 'left-full -translate-x-full' : trip.status === 'DISPATCHED' ? 'left-1/2 -translate-x-1/2 animate-pulse' : 'left-0'}`}></div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-muted uppercase tracking-wider mb-2">Destination</div>
            <div className="text-2xl font-semibold flex items-center justify-end">
              <MapPin className="w-6 h-6 text-primary-500 mr-2" />
              {trip.destination}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8 pt-8 border-t border-border/50">
          <div>
            <div className="text-sm text-muted mb-1">Cargo Weight</div>
            <div className="font-medium text-lg">{parseFloat(trip.cargo_weight).toLocaleString()} kg</div>
          </div>
          <div>
            <div className="text-sm text-muted mb-1">Projected Revenue</div>
            <div className="font-medium text-lg text-green-400">₹{parseFloat(trip.revenue).toLocaleString()}</div>
          </div>
          {trip.actual_distance && (
            <div>
              <div className="text-sm text-muted mb-1">Actual Distance</div>
              <div className="font-medium text-lg">{parseFloat(trip.actual_distance).toLocaleString()} km</div>
            </div>
          )}
          {trip.fuel_consumed && (
            <div>
              <div className="text-sm text-muted mb-1">Fuel Consumed</div>
              <div className="font-medium text-lg">{parseFloat(trip.fuel_consumed).toLocaleString()} L</div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-3 mt-6 border-t border-border/50 pt-6">
          {trip.status === 'DRAFT' && (
            <button 
              onClick={handleDispatch} disabled={processing}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl flex items-center transition-all disabled:opacity-50"
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              Dispatch Trip
            </button>
          )}
          {trip.status === 'DISPATCHED' && (
            <>
              <button 
                onClick={() => { setShowCancelModal(true); setActionError(null); }} disabled={processing}
                className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 dark:hover:bg-red-900/50 font-semibold rounded-xl flex items-center transition-all disabled:opacity-50"
              >
                <XCircle className="w-5 h-5 mr-2" />
                Cancel Trip
              </button>
              <button 
                onClick={() => { 
                  setShowCompleteModal(true); 
                  setActionError(null); 
                  setCompleteData({ 
                    finalOdometer: vehicle?.odometer ? parseFloat(vehicle.odometer) + parseFloat(trip.planned_distance) : '', 
                    fuelConsumed: '' 
                  }); 
                }} 
                disabled={processing}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl flex items-center transition-all disabled:opacity-50"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Complete Trip
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Driver & Vehicle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <Truck className="w-6 h-6 text-primary-500" />
                <h3 className="text-lg font-bold">Assigned Vehicle</h3>
              </div>
              {vehicle ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted">Registration</div>
                    <div className="font-medium text-lg">{vehicle.registration_number}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted">Model / Type</div>
                    <div className="font-medium">{vehicle.name} ({vehicle.type})</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted">Current Odometer</div>
                    <div className="font-medium">{vehicle.odometer} km</div>
                  </div>
                </div>
              ) : (
                <div className="text-muted">Vehicle details not found.</div>
              )}
            </div>

            <div className="bg-surface border border-border rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <User className="w-6 h-6 text-primary-500" />
                <h3 className="text-lg font-bold">Assigned Driver</h3>
              </div>
              {driver ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted">Driver Name</div>
                    <div className="font-medium text-lg">{driver.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted">License Number</div>
                    <div className="font-medium">{driver.license_number}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted">Safety Score</div>
                    <div className="font-medium flex items-center">
                      <div className="w-16 h-2 bg-border rounded-full mr-3 overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${driver.safety_score}%` }}></div>
                      </div>
                      {driver.safety_score}/100
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-muted">Driver details not found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-6 lg:col-span-3">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-muted" />
            <h3 className="text-lg font-bold">Audit History</h3>
          </div>
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {history && history.length > 0 ? history.map((evt, idx) => (
              <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-surface text-primary-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl bg-background border border-border shadow-sm">
                  <div className="flex flex-col">
                    <span className="font-semibold">{evt.new_status}</span>
                    <span className="text-xs text-muted">{new Date(evt.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-muted text-center py-4">No history recorded yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/50">
              <h2 className="text-xl font-bold tracking-tight">Complete Trip</h2>
              <button onClick={() => setShowCompleteModal(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted hover:text-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {actionError && <div className="text-red-400 text-sm mb-4">{actionError}</div>}
              <div>
                <label className="block text-sm font-medium mb-1.5">Final Odometer (km)</label>
                <input type="number" value={completeData.finalOdometer} onChange={(e) => setCompleteData({ ...completeData, finalOdometer: e.target.value })} required min={vehicle?.odometer || 0}
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary-500 outline-none" placeholder={`Min ${vehicle?.odometer} km`} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Fuel Consumed (Liters)</label>
                <input type="number" value={completeData.fuelConsumed} onChange={(e) => setCompleteData({ ...completeData, fuelConsumed: e.target.value })} required min="0"
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. 150" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border bg-background/50 flex justify-end space-x-3">
              <button onClick={() => setShowCompleteModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium">Cancel</button>
              <button onClick={handleComplete} disabled={processing} className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-background/50">
              <h2 className="text-xl font-bold tracking-tight">Cancel Trip</h2>
              <button onClick={() => setShowCancelModal(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X className="w-5 h-5 text-muted hover:text-foreground" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {actionError && <div className="text-red-400 text-sm mb-4">{actionError}</div>}
              <div>
                <label className="block text-sm font-medium mb-1.5">Cancellation Reason</label>
                <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} required rows={3}
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:ring-2 focus:ring-primary-500 outline-none resize-none" placeholder="Explain why this trip is being cancelled..." />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border bg-background/50 flex justify-end space-x-3">
              <button onClick={() => setShowCancelModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm font-medium">Close</button>
              <button onClick={handleCancel} disabled={processing} className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center">
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Trip
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TripDetail;
