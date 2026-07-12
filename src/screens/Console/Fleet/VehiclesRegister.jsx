import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Truck, AlertTriangle, Save } from 'lucide-react';
import { motion } from 'framer-motion';
import { fleetAPI } from '../../../api_config/Fleet/Fleet_Api';

export default function VehiclesRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    registrationNumber: '',
    name: '',
    type: '',
    maxLoadCapacity: '',
    acquisitionCost: '',
    odometer: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      await fleetAPI.registerVehicle({
        ...formData,
        maxLoadCapacity: parseFloat(formData.maxLoadCapacity),
        acquisitionCost: parseFloat(formData.acquisitionCost),
        odometer: parseFloat(formData.odometer)
      });
      navigate('/console/fleet');
    } catch (err) {
      setError(err.message || 'Failed to register vehicle');
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl">
      <button 
        onClick={() => navigate('/console/fleet')} 
        className="flex items-center gap-2 text-sm font-medium text-muted hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Fleet
      </button>
      
      <div className="bg-surface border border-border rounded-2xl shadow-sm p-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Register New Vehicle</h1>
            <p className="text-muted">Add a new vehicle to the operational fleet.</p>
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
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-1.5">Registration Number (License Plate)</label>
              <input 
                type="text" name="registrationNumber" value={formData.registrationNumber} onChange={handleInputChange} required
                className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all uppercase" 
                placeholder="e.g. MH-12-AB-1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Vehicle Name / Model</label>
              <input 
                type="text" name="name" value={formData.name} onChange={handleInputChange} required
                className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                placeholder="e.g. Tata Prima 4028S"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Vehicle Type</label>
              <select 
                name="type" value={formData.type} onChange={handleInputChange} required
                className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
              >
                <option value="">Select Type</option>
                <option value="HEAVY_TRUCK">Heavy Truck</option>
                <option value="LIGHT_TRUCK">Light Truck</option>
                <option value="VAN">Delivery Van</option>
                <option value="TRAILER">Trailer</option>
                <option value="REFRIGERATED">Refrigerated Truck</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Max Load Capacity (kg)</label>
              <input 
                type="number" name="maxLoadCapacity" min="1" step="0.01" value={formData.maxLoadCapacity} onChange={handleInputChange} required
                className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                placeholder="e.g. 5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Initial Odometer (km)</label>
              <input 
                type="number" name="odometer" min="0" step="0.1" value={formData.odometer} onChange={handleInputChange} required
                className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                placeholder="e.g. 15000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Acquisition Cost (₹)</label>
              <input 
                type="number" name="acquisitionCost" min="0" step="0.01" value={formData.acquisitionCost} onChange={handleInputChange} required
                className="w-full px-4 py-2 border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all" 
                placeholder="e.g. 45000"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex justify-end gap-3">
            <button 
              type="button" onClick={() => navigate('/console/fleet')}
              className="px-6 py-2.5 font-medium text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl shadow-lg shadow-primary-500/20 transition-all disabled:opacity-50"
            >
              {submitting ? 'Registering...' : <><Save className="w-5 h-5" /> Register Vehicle</>}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}