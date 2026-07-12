import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, AlertTriangle, Save, Calendar, Activity, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { driverAPI } from '../../../api_config/Drivers/Driver_config';

export default function DriverDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [driver, setDriver] = useState(null);
  const [statusHistory, setStatusHistory] = useState([]);
  const [safetyHistory, setSafetyHistory] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [historyFilterDate, setHistoryFilterDate] = useState('');
  
  // Form state for creating a new driver
  const [formData, setFormData] = useState({
    name: '',
    licenseNumber: '',
    licenseCategory: '',
    licenseExpiry: '',
    contactNumber: '',
    safetyScore: 100
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id !== 'new') {
      fetchDriverAndHistory();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchDriverAndHistory = async () => {
    setLoading(true);
    try {
      const [driverRes, statusRes, safetyRes] = await Promise.all([
        driverAPI.getDriverDetails(id),
        driverAPI.getDriverStatusHistory(id),
        driverAPI.getDriverSafetyHistory(id)
      ]);
      setDriver(driverRes.driver);
      setStatusHistory(statusRes.history || []);
      setSafetyHistory(safetyRes.history || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch driver details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      await driverAPI.createDriver({
        ...formData,
        safetyScore: parseInt(formData.safetyScore, 10)
      });
      navigate('/console/drivers');
    } catch (err) {
      setError(err.message || 'Failed to create driver');
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    if (newStatus === driver.status || newStatus === 'ON_TRIP') return;

    const reason = window.prompt(`Please provide a reason for changing status to ${newStatus}:`, 'Status updated via console');
    if (reason === null) return; 

    try {
      await driverAPI.updateDriverStatus(id, driver.status, newStatus, reason);
      fetchDriverAndHistory();
    } catch (err) {
      alert(err.message || 'Failed to update driver status');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted">Loading driver details...</div>;
  }

  // Create New Driver Form
  if (id === 'new') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
        <button 
          onClick={() => navigate('/console/drivers')} 
          className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Drivers
        </button>
        
        <div className="bg-surface border border-border rounded-2xl shadow-sm p-8 max-w-4xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Create New Driver</h1>
              <p className="text-muted">Register a new driver in the fleet.</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/50 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
                <input 
                  type="text" name="name" value={formData.name} onChange={handleInputChange} required
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Contact Number</label>
                <input 
                  type="tel" name="contactNumber" value={formData.contactNumber} onChange={handleInputChange} required
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">License Number</label>
                <input 
                  type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange} required
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all uppercase" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">License Category</label>
                <select 
                  name="licenseCategory" value={formData.licenseCategory} onChange={handleInputChange} required
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                >
                  <option value="">Select Category</option>
                  <option value="HMV">Heavy Motor Vehicle (HMV)</option>
                  <option value="LMV">Light Motor Vehicle (LMV)</option>
                  <option value="COMMERCIAL">Commercial (CDL)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">License Expiry Date</label>
                <input 
                  type="date" name="licenseExpiry" value={formData.licenseExpiry} onChange={handleInputChange} required
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Initial Safety Score</label>
                <input 
                  type="number" name="safetyScore" min="0" max="100" value={formData.safetyScore} onChange={handleInputChange} required
                  className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-3">
              <button 
                type="button" onClick={() => navigate('/console/drivers')}
                className="px-6 py-2.5 font-medium text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50"
              >
                {submitting ? 'Saving...' : <><Save className="w-5 h-5" /> Register Driver</>}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  // Detail View
  if (error || !driver) {
    return (
      <div className="p-8 text-center text-red-500">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
        <p>{error || 'Driver not found'}</p>
        <button onClick={() => navigate('/console/drivers')} className="mt-4 text-primary-600 underline">
          Go back
        </button>
      </div>
    );
  }

  const { compliance } = driver;
  const isLicenseValid = compliance?.licenseStatus === 'VALID';
  const isExpiringSoon = compliance?.licenseStatus === 'EXPIRING_SOON';
  const licenseColor = isLicenseValid ? 'text-green-600' : isExpiringSoon ? 'text-yellow-600' : 'text-red-600';

  const filterByDate = (historyArray) => {
    if (!historyFilterDate) return historyArray;
    return historyArray.filter(item => {
      const itemDate = new Date(item.created_at).toISOString().split('T')[0];
      return itemDate === historyFilterDate;
    });
  };

  const filteredStatusHistory = filterByDate(statusHistory);
  const filteredSafetyHistory = filterByDate(safetyHistory);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full"
    >
      <button 
        onClick={() => navigate('/console/drivers')}
        className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Drivers
      </button>

      <div className="bg-surface border border-border rounded-2xl shadow-sm p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start gap-6">
          <div className="w-24 h-24 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
            <User className="w-12 h-12" />
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold mb-2">{driver.name}</h1>
                <p className="text-muted mb-4">Detailed view for driver ID: <span className="font-mono text-foreground">{id}</span></p>
                
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    driver.status === 'AVAILABLE' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50' :
                    driver.status === 'SUSPENDED' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50' :
                    driver.status === 'ON_TRIP' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' :
                    'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }`}>
                    {driver.status}
                  </span>
                  
                  {driver.status !== 'ON_TRIP' && (
                    <select 
                      value={driver.status}
                      onChange={handleStatusChange}
                      className="ml-4 px-3 py-1 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                    >
                      <option value="AVAILABLE">Mark Available</option>
                      <option value="OFF_DUTY">Mark Off Duty</option>
                      <option value="SUSPENDED">Suspend Driver</option>
                    </select>
                  )}
                  {driver.status === 'ON_TRIP' && (
                    <span className="ml-4 text-xs text-muted">(Status managed automatically by trips)</span>
                  )}
                </div>
              </div>
              
              <div className="mt-6 sm:mt-0 p-4 border border-border rounded-xl bg-background/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className={`w-5 h-5 ${driver.safety_score >= 90 ? 'text-green-500' : driver.safety_score >= 75 ? 'text-yellow-500' : 'text-red-500'}`} />
                  <span className="font-semibold text-lg">{driver.safety_score}/100</span>
                </div>
                <div className="text-xs text-muted uppercase tracking-wider">Safety Score</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-10 border-t border-border pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">License Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted">License No:</span>
                <span className="font-medium font-mono">{driver.license_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Category:</span>
                <span className="font-medium">{driver.license_category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Expiration:</span>
                <span className={`font-medium ${licenseColor}`}>
                  {new Date(driver.license_expiry).toLocaleDateString()}
                  {isExpiringSoon && ' (Expiring Soon)'}
                  {!isLicenseValid && !isExpiringSoon && ' (Expired)'}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">Contact</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted">Phone Number:</span>
                <span className="font-medium">{driver.contact_number}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* History Sections */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">Audit History</h2>
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
            <Activity className="w-5 h-5 text-primary-600" />
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

        {/* Safety History */}
        <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-surface-hover/50 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            <h3 className="font-bold">Safety Score History</h3>
          </div>
          <div className="p-0 overflow-y-auto max-h-[400px]">
            {filteredSafetyHistory.length === 0 ? (
              <div className="p-8 text-center text-muted">No safety score history found.</div>
            ) : (
              <div className="divide-y divide-border">
                {filteredSafetyHistory.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-surface-hover/30 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {item.previous_score !== null ? (
                          <>
                            <span className="text-muted">{item.previous_score}</span>
                            <span>→</span>
                          </>
                        ) : null}
                        <span className={`font-bold ${item.new_score >= 90 ? 'text-green-500' : item.new_score >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>
                          {item.new_score}
                        </span>
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
      </div>
    </motion.div>
  );
}
