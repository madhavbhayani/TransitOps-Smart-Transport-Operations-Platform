import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, Shield, FileText, Trash2, Edit, Activity, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { driverAPI } from '../../../api_config/Drivers/Driver_config';

export default function DriversList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Driver State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '', contactNumber: '', licenseNumber: '', licenseCategory: '', licenseExpiry: ''
  });

  // Safety Score State
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [safetyDriver, setSafetyDriver] = useState(null);
  const [safetyScore, setSafetyScore] = useState('');
  const [safetyReason, setSafetyReason] = useState('');
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    fetchDrivers();
  }, [searchTerm]);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      const response = await driverAPI.getDrivers(searchTerm ? { search: searchTerm } : {});
      setDrivers(response.drivers || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch drivers');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this driver? This action cannot be undone.')) return;
    
    try {
      await driverAPI.deleteDriver(id);
      fetchDrivers(); // Refresh list after deletion
    } catch (err) {
      alert(err.message || 'Failed to delete driver');
    }
  };

  const openEditModal = (driver) => {
    setEditingDriver(driver);
    setEditFormData({
      name: driver.name || '',
      contactNumber: driver.contact_number || '',
      licenseNumber: driver.license_number || '',
      licenseCategory: driver.license_category || '',
      licenseExpiry: driver.license_expiry ? driver.license_expiry.split('T')[0] : ''
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    try {
      setSubmitError(null);
      await driverAPI.updateDriver(editingDriver.id, editFormData);
      setShowEditModal(false);
      fetchDrivers();
    } catch (err) {
      setSubmitError(err.message || 'Failed to update driver');
    }
  };

  const openSafetyModal = (driver) => {
    setSafetyDriver(driver);
    setSafetyScore(driver.safety_score || '');
    setSafetyReason('');
    setShowSafetyModal(true);
  };

  const handleSafetySubmit = async () => {
    try {
      setSubmitError(null);
      await driverAPI.updateSafetyScore(safetyDriver.id, parseFloat(safetyScore), safetyReason);
      setShowSafetyModal(false);
      fetchDrivers();
    } catch (err) {
      setSubmitError(err.message || 'Failed to update safety score');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Driver Management</h1>
          <p className="text-muted">View, manage, and add new drivers to your fleet.</p>
        </div>
        
        <button 
          onClick={() => navigate('/console/drivers/new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl shadow-lg shadow-primary-500/20 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create New Driver
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/50">
          {error}
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted" />
            </div>
            <input
              type="text"
              placeholder="Search by name or license..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-hover text-muted uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 font-medium">Driver Info</th>
                <th className="px-6 py-4 font-medium">License No.</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Safety Score</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    Loading drivers...
                  </td>
                </tr>
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    No drivers found.
                  </td>
                </tr>
              ) : (
                drivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-surface-hover/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{driver.name}</div>
                      <div className="text-muted text-xs">{driver.contact_number}</div>
                    </td>
                    <td className="px-6 py-4 font-mono text-muted">{driver.license_number}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        driver.status === 'AVAILABLE' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                        driver.status === 'SUSPENDED' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                        driver.status === 'ON_TRIP' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' :
                        'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                      }`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Shield className={`w-4 h-4 ${driver.safety_score >= 90 ? 'text-green-500' : driver.safety_score >= 75 ? 'text-yellow-500' : 'text-red-500'}`} />
                        <span className="font-semibold">{driver.safety_score}/100</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/console/drivers/${driver.id}`)}
                        className="p-1.5 text-muted hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <FileText className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => openEditModal(driver)}
                        className="p-1.5 text-muted hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors ml-1"
                        title="Edit Driver"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => openSafetyModal(driver)}
                        className="p-1.5 text-muted hover:text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors ml-1"
                        title="Update Safety Score"
                      >
                        <Activity className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(driver.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-1"
                        title="Delete Driver"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Driver Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">Edit Driver</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {submitError && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">{submitError}</div>}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Full Name</label>
                <input type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Contact Number</label>
                <input type="text" value={editFormData.contactNumber} onChange={e => setEditFormData({...editFormData, contactNumber: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">License Number</label>
                <input type="text" value={editFormData.licenseNumber} onChange={e => setEditFormData({...editFormData, licenseNumber: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">License Category</label>
                <select 
                  value={editFormData.licenseCategory} 
                  onChange={e => setEditFormData({...editFormData, licenseCategory: e.target.value})} 
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  <option value="">Select Category</option>
                  <option value="HMV">Heavy Motor Vehicle (HMV)</option>
                  <option value="LMV">Light Motor Vehicle (LMV)</option>
                  <option value="COMMERCIAL">Commercial (CDL)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">License Expiry</label>
                <input type="date" value={editFormData.licenseExpiry} onChange={e => setEditFormData({...editFormData, licenseExpiry: e.target.value})} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
              <button onClick={handleEditSubmit} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Score Modal */}
      {showSafetyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">Update Safety Score</h2>
              <button onClick={() => setShowSafetyModal(false)} className="p-2 hover:bg-white/5 rounded-lg">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {submitError && <div className="p-3 bg-red-500/10 text-red-400 rounded-lg text-sm">{submitError}</div>}
              <div>
                <label className="block text-sm font-medium text-muted mb-1">New Score (0-100)</label>
                <input type="number" min="0" max="100" value={safetyScore} onChange={e => setSafetyScore(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted mb-1">Reason for Update</label>
                <textarea value={safetyReason} onChange={e => setSafetyReason(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg bg-background" rows="3" placeholder="e.g., Completed defensive driving course" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
              <button onClick={() => setShowSafetyModal(false)} className="px-4 py-2 border border-border rounded-lg text-sm">Cancel</button>
              <button onClick={handleSafetySubmit} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">Update Score</button>
            </div>
          </div>
        </div>
      )}

    </motion.div>
  );
}
