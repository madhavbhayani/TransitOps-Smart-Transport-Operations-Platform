import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { fleetAPI } from '../../../api_config/Fleet/Fleet_Api';

export default function RegisterMaintenance() {
  const navigate = useNavigate();
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'start', 'complete', 'cancel'
  const [selectedLogId, setSelectedLogId] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({
    vehicleId: '',
    maintenanceType: 'ROUTINE',
    description: '',
    cost: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [maintRes, vehiclesRes] = await Promise.all([
        fleetAPI.getAllMaintenance(),
        fleetAPI.getVehicles({ status: 'AVAILABLE' }) // To allow selection for new maintenance
      ]);
      setMaintenanceLogs(maintRes.maintenance || []);
      setVehicles(vehiclesRes.vehicles || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch maintenance logs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (action, logId = null, defaultVehicleId = '') => {
    setModalAction(action);
    setSelectedLogId(logId);
    setFormData({
      vehicleId: defaultVehicleId,
      maintenanceType: 'ROUTINE',
      description: '',
      cost: 0,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalAction(null);
    setSelectedLogId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (modalAction === 'start') {
        await fleetAPI.startMaintenance(formData.vehicleId, {
          maintenanceType: formData.maintenanceType,
          description: formData.description,
          startDate: formData.startDate
        });
      } else if (modalAction === 'complete') {
        await fleetAPI.completeMaintenance(formData.vehicleId, selectedLogId, {
          cost: parseFloat(formData.cost),
          description: formData.description,
          endDate: formData.endDate
        });
      } else if (modalAction === 'cancel') {
        await fleetAPI.cancelMaintenance(formData.vehicleId, selectedLogId, {
          reason: formData.description
        });
      }
      
      closeModal();
      // Refetch everything
      fetchData();
    } catch (err) {
      alert(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Fleet Maintenance</h1>
          <p className="text-muted">Manage service logs and schedule repairs for vehicles.</p>
        </div>
        <button 
          onClick={() => openModal('start')}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-primary-500/20"
        >
          <Plus className="w-5 h-5" />
          Schedule Maintenance
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-hover/30 flex items-center gap-2">
          <Wrench className="w-5 h-5 text-yellow-600" />
          <h3 className="font-bold">Maintenance Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-hover/50 text-sm">
                <th className="p-4 font-semibold text-muted uppercase tracking-wider">Log ID</th>
                <th className="p-4 font-semibold text-muted uppercase tracking-wider">Vehicle</th>
                <th className="p-4 font-semibold text-muted uppercase tracking-wider">Type & Dates</th>
                <th className="p-4 font-semibold text-muted uppercase tracking-wider">Cost</th>
                <th className="p-4 font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="p-4 font-semibold text-muted uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-muted">Loading maintenance logs...</td>
                </tr>
              ) : maintenanceLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-muted">No maintenance logs found.</td>
                </tr>
              ) : (
                maintenanceLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="p-4 font-mono text-sm">#{log.id}</td>
                    <td className="p-4">
                      <div className="font-medium hover:text-primary-600 cursor-pointer" onClick={() => navigate(`/console/fleet/${log.vehicle_id}`)}>
                        {log.vehicle_name}
                      </div>
                      <div className="text-xs text-muted font-mono">{log.vehicle_reg}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium">{log.maintenance_type}</div>
                      <div className="text-xs text-muted">Started: {new Date(log.start_date).toLocaleDateString()}</div>
                      {log.end_date && <div className="text-xs text-muted">Ended: {new Date(log.end_date).toLocaleDateString()}</div>}
                    </td>
                    <td className="p-4 font-medium">${Number(log.cost).toLocaleString()}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        log.status === 'ACTIVE' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50' :
                        log.status === 'COMPLETED' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                        'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {log.status === 'ACTIVE' && (
                        <>
                          <button 
                            onClick={() => openModal('complete', log.id, log.vehicle_id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded"
                          >
                            <CheckCircle className="w-3 h-3" /> Complete
                          </button>
                          <button 
                            onClick={() => openModal('cancel', log.id, log.vehicle_id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded"
                          >
                            <XCircle className="w-3 h-3" /> Cancel
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-surface border border-border rounded-2xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4">
              {modalAction === 'start' ? 'Schedule Maintenance' : modalAction === 'complete' ? 'Complete Maintenance' : 'Cancel Maintenance'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {modalAction === 'start' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Select Vehicle</label>
                    <select 
                      name="vehicleId" value={formData.vehicleId} onChange={handleInputChange} required
                      className="w-full px-4 py-2 border border-border rounded-xl bg-background"
                    >
                      <option value="">-- Choose Available Vehicle --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.name} ({v.registration_number})</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted mt-1">Only vehicles with status AVAILABLE can be scheduled for maintenance.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Maintenance Type</label>
                      <input 
                        type="text" name="maintenanceType" value={formData.maintenanceType} onChange={handleInputChange} required placeholder="e.g. ROUTINE"
                        className="w-full px-4 py-2 border border-border rounded-xl bg-background"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Start Date</label>
                      <input 
                        type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required
                        className="w-full px-4 py-2 border border-border rounded-xl bg-background"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalAction === 'complete' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Final Cost (₹)</label>
                    <input 
                      type="number" name="cost" value={formData.cost} onChange={handleInputChange} required min="0" step="0.01"
                      className="w-full px-4 py-2 border border-border rounded-xl bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Completion Date</label>
                    <input 
                      type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required
                      className="w-full px-4 py-2 border border-border rounded-xl bg-background"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">Description / Notes</label>
                <textarea 
                  name="description" value={formData.description} onChange={handleInputChange} rows={3} required={modalAction === 'cancel'}
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background resize-none"
                  placeholder={modalAction === 'cancel' ? "Reason for cancellation" : "Maintenance details"}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border">
                <button type="button" onClick={closeModal} className="px-4 py-2 font-medium text-muted hover:text-foreground">Cancel</button>
                <button 
                  type="submit" disabled={submitting}
                  className={`px-4 py-2 rounded-xl font-medium text-white transition-all ${
                    modalAction === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
                  }`}
                >
                  {submitting ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}