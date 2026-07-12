import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Fuel, Receipt, AlertTriangle, Download, X, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { financeAPI } from '../../../api_config/FuelExpenses/finance_fuel_expense_api';
import { fleetAPI } from '../../../api_config/Fleet/Fleet_Api';
import { tripAPI } from '../../../api_config/Trips/Trip_api_service';

export default function FuelExpenseList() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fuel'); // 'fuel', 'expenses', or 'audit'
  const [searchTerm, setSearchTerm] = useState('');
  
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [voidedFuelLogs, setVoidedFuelLogs] = useState([]);
  const [voidedExpenses, setVoidedExpenses] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals state
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    vehicleId: '',
    tripId: '',
    liters: '',
    cost: '',
    fuelDate: new Date().toISOString().split('T')[0],
    odometer: '',
    notes: '',
    expenseType: 'TOLL',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, searchTerm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (searchTerm) {
        const searchResults = await financeAPI.searchFinancials(searchTerm);
        if (activeTab === 'fuel') setFuelLogs(searchResults.fuelLogs || []);
        else if (activeTab === 'expenses') setExpenses(searchResults.expenses || []);
        else {
          setVoidedFuelLogs((searchResults.fuelLogs || []).filter(l => l.is_voided));
          setVoidedExpenses((searchResults.expenses || []).filter(e => e.status === 'VOIDED'));
        }
      } else {
        if (activeTab === 'fuel') {
          const res = await financeAPI.getFuelLogs();
          setFuelLogs(res.fuelLogs || []);
        } else if (activeTab === 'expenses') {
          const res = await financeAPI.getExpenses();
          setExpenses(res.expenses || []);
        } else if (activeTab === 'audit') {
          const [fuelRes, expRes] = await Promise.all([
            financeAPI.getFuelLogs({ onlyVoided: true }),
            financeAPI.getExpenses({ status: 'VOIDED' })
          ]);
          setVoidedFuelLogs(fuelRes.fuelLogs || []);
          setVoidedExpenses(expRes.expenses || []);
        }
      }
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const vRes = await fleetAPI.getVehicles();
      const tRes = await tripAPI.filterTrips({});
      setVehicles(vRes.vehicles || []);
      setTrips(tRes.trips || []);
    } catch (err) {
      console.error('Failed to fetch dependencies', err);
    }
  };

  const openFuelModal = () => {
    fetchDependencies();
    setFormData(prev => ({ ...prev, vehicleId: '', tripId: '', liters: '', cost: '', odometer: '', notes: '' }));
    setShowFuelModal(true);
  };

  const openExpenseModal = () => {
    fetchDependencies();
    setFormData(prev => ({ ...prev, vehicleId: '', tripId: '', expenseType: 'TOLL', amount: '', description: '' }));
    setShowExpenseModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const payload = {
        vehicleId: parseInt(formData.vehicleId),
        tripId: formData.tripId ? parseInt(formData.tripId) : null,
        liters: parseFloat(formData.liters),
        cost: parseFloat(formData.cost),
        fuelDate: formData.fuelDate,
        odometer: formData.odometer ? parseFloat(formData.odometer) : null,
        notes: formData.notes
      };
      await financeAPI.recordFuelLog(payload);
      setShowFuelModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to record fuel log');
    } finally {
      setModalLoading(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setModalLoading(true);
    try {
      const payload = {
        vehicleId: parseInt(formData.vehicleId),
        tripId: formData.tripId ? parseInt(formData.tripId) : null,
        expenseType: formData.expenseType,
        amount: parseFloat(formData.amount),
        expenseDate: formData.expenseDate,
        description: formData.description
      };
      await financeAPI.recordExpense(payload);
      setShowExpenseModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to record expense');
    } finally {
      setModalLoading(false);
    }
  };

  const handleExport = async (format) => {
    try {
      await financeAPI.exportData(activeTab === 'fuel' ? 'fuel' : 'expenses', format);
    } catch (err) {
      alert(err.message || `Failed to export ${format.toUpperCase()}`);
    }
  };

  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Fuel & Expenses</h1>
          <p className="text-muted">Manage fuel logs, tolls, and operational expenses.</p>
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:bg-surface-hover text-foreground font-medium rounded-xl transition-all"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
            <AnimatePresence>
              {showExportMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 mt-2 w-36 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20"
                >
                  <button
                    onClick={() => { setShowExportMenu(false); handleExport('csv'); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors text-foreground font-medium border-b border-border"
                  >
                    Export as CSV
                  </button>
                  <button
                    onClick={() => { setShowExportMenu(false); handleExport('pdf'); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-hover transition-colors text-foreground font-medium"
                  >
                    Export as PDF
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {activeTab === 'fuel' ? (
            <button 
              onClick={openFuelModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl shadow-lg shadow-primary-500/20 transition-all"
            >
              <Plus className="w-5 h-5" />
              Record Fuel Log
            </button>
          ) : (
            <button 
              onClick={openExpenseModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl shadow-lg shadow-primary-500/20 transition-all"
            >
              <Plus className="w-5 h-5" />
              Record Expense
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800/50 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Tabs & Search */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex bg-background border border-border rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('fuel')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'fuel' 
                  ? 'bg-primary-500 text-black shadow-sm' 
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Fuel className="w-4 h-4" />
              Fuel Logs
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'expenses' 
                  ? 'bg-primary-500 text-black shadow-sm' 
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <Receipt className="w-4 h-4" />
              Other Expenses
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'audit' 
                  ? 'bg-primary-500 text-black shadow-sm' 
                  : 'text-muted hover:text-foreground'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              Audit Logs
            </button>
          </div>

          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-muted" />
            </div>
            <input
              type="text"
              placeholder={`Search ${activeTab === 'fuel' ? 'fuel logs' : activeTab === 'expenses' ? 'expenses' : 'audit logs'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {activeTab === 'fuel' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-hover text-muted uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Date & ID</th>
                  <th className="px-6 py-4 font-medium">Vehicle</th>
                  <th className="px-6 py-4 font-medium">Details</th>
                  <th className="px-6 py-4 font-medium">Cost</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-muted">Loading fuel logs...</td>
                  </tr>
                ) : fuelLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-muted">
                        <Fuel className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-base">No fuel logs found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  fuelLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium">{new Date(log.fuel_date).toLocaleDateString()}</div>
                        <div className="text-xs text-muted">ID: #{log.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{log.registration_number}</div>
                        <div className="text-xs text-muted">{log.vehicle_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{log.liters} L</div>
                        {log.trip_id && <div className="text-xs text-primary-500">Trip #{log.trip_id}</div>}
                      </td>
                      <td className="px-6 py-4 font-medium text-red-400">
                        ₹{parseFloat(log.cost).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {log.is_voided ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50">
                            Voided
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50">
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/console/expenses/fuel/${log.id}`)}
                          className="p-2 text-muted hover:text-primary-500 bg-background rounded-lg border border-border hover:border-primary-500/50 transition-all inline-flex"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'expenses' ? (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-hover text-muted uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">Date & ID</th>
                  <th className="px-6 py-4 font-medium">Type & Desc</th>
                  <th className="px-6 py-4 font-medium">Vehicle</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-muted">Loading expenses...</td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-muted">
                        <Receipt className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-base">No expenses found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-surface-hover/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium">{new Date(exp.expense_date).toLocaleDateString()}</div>
                        <div className="text-xs text-muted">ID: #{exp.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{exp.expense_type}</div>
                        <div className="text-xs text-muted truncate max-w-[150px]">{exp.description || 'No description'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{exp.registration_number}</div>
                        {exp.trip_id && <div className="text-xs text-primary-500">Trip #{exp.trip_id}</div>}
                      </td>
                      <td className="px-6 py-4 font-medium text-red-400">
                        ₹{parseFloat(exp.amount).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          exp.status === 'RECORDED' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800/50'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/console/expenses/other/${exp.id}`)}
                          className="p-2 text-muted hover:text-primary-500 bg-background rounded-lg border border-border hover:border-primary-500/50 transition-all inline-flex"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : activeTab === 'audit' ? (
            <div className="flex flex-col">
              <div className="p-4 bg-surface-hover border-b border-border font-bold">Voided Fuel Logs</div>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-hover text-muted uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date & ID</th>
                    <th className="px-6 py-4 font-medium">Vehicle</th>
                    <th className="px-6 py-4 font-medium">Details</th>
                    <th className="px-6 py-4 font-medium">Cost</th>
                    <th className="px-6 py-4 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {voidedFuelLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-muted">No voided fuel logs found.</td>
                    </tr>
                  ) : (
                    voidedFuelLogs.map((log) => (
                      <tr key={`f-${log.id}`} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium">{new Date(log.fuel_date).toLocaleDateString()}</div>
                          <div className="text-xs text-muted">ID: #{log.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{log.registration_number}</div>
                          <div className="text-xs text-muted">{log.vehicle_name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{log.liters} L</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-red-400">
                          ₹{parseFloat(log.cost).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-red-400 max-w-[200px] truncate" title={log.void_reason}>
                          {log.void_reason || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="p-4 bg-surface-hover border-y border-border font-bold mt-4">Voided Expenses</div>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-surface-hover text-muted uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date & ID</th>
                    <th className="px-6 py-4 font-medium">Type & Desc</th>
                    <th className="px-6 py-4 font-medium">Vehicle</th>
                    <th className="px-6 py-4 font-medium">Amount</th>
                    <th className="px-6 py-4 font-medium">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {voidedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-muted">No voided expenses found.</td>
                    </tr>
                  ) : (
                    voidedExpenses.map((exp) => (
                      <tr key={`e-${exp.id}`} className="hover:bg-surface-hover/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium">{new Date(exp.expense_date).toLocaleDateString()}</div>
                          <div className="text-xs text-muted">ID: #{exp.id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{exp.expense_type}</div>
                          <div className="text-xs text-muted truncate max-w-[150px]">{exp.description || 'No description'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{exp.registration_number}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-red-400">
                          ₹{parseFloat(exp.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-red-400 max-w-[200px] truncate" title={exp.void_reason}>
                          {exp.void_reason || 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>

      {/* Fuel Modal */}
      <AnimatePresence>
        {showFuelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-primary-500" />
                  Record Fuel Log
                </h3>
                <button onClick={() => setShowFuelModal(false)} className="text-muted hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleFuelSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Vehicle *</label>
                    <select name="vehicleId" value={formData.vehicleId} onChange={handleInputChange} required className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                      <option value="">Select Vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Trip (Optional)</label>
                    <select name="tripId" value={formData.tripId} onChange={handleInputChange} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                      <option value="">None</option>
                      {trips.filter(t => t.vehicle_id == formData.vehicleId).map(t => <option key={t.id} value={t.id}>Trip #{t.id} ({t.source} - {t.destination})</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Liters *</label>
                    <input type="number" step="0.001" min="0.001" name="liters" value={formData.liters} onChange={handleInputChange} required className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Cost (₹) *</label>
                    <input type="number" step="0.01" min="0" name="cost" value={formData.cost} onChange={handleInputChange} required className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Date *</label>
                    <input type="date" name="fuelDate" value={formData.fuelDate} onChange={handleInputChange} required className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Odometer (Optional)</label>
                    <input type="number" step="0.01" min="0" name="odometer" value={formData.odometer} onChange={handleInputChange} className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="2" className="w-full px-3 py-2 border border-border rounded-lg bg-background"></textarea>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowFuelModal(false)} className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg font-medium">Cancel</button>
                  <button type="submit" disabled={modalLoading} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50">
                    {modalLoading ? 'Saving...' : 'Save Fuel Log'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Expense Modal */}
      <AnimatePresence>
        {showExpenseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary-500" />
                  Record Expense
                </h3>
                <button onClick={() => setShowExpenseModal(false)} className="text-muted hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Vehicle *</label>
                    <select name="vehicleId" value={formData.vehicleId} onChange={handleInputChange} required className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                      <option value="">Select Vehicle</option>
                      {vehicles.map(v => <option key={v.id} value={v.id}>{v.registration_number}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Trip (Optional)</label>
                    <select name="tripId" value={formData.tripId} onChange={handleInputChange} className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                      <option value="">None</option>
                      {trips.filter(t => t.vehicle_id == formData.vehicleId).map(t => <option key={t.id} value={t.id}>Trip #{t.id} ({t.source} - {t.destination})</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Type *</label>
                    <select name="expenseType" value={formData.expenseType} onChange={handleInputChange} required className="w-full px-3 py-2 border border-border rounded-lg bg-background">
                      <option value="TOLL">Toll</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Amount (₹) *</label>
                    <input type="number" step="0.01" min="0.01" name="amount" value={formData.amount} onChange={handleInputChange} required className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Date *</label>
                  <input type="date" name="expenseDate" value={formData.expenseDate} onChange={handleInputChange} required className="w-full px-3 py-2 border border-border rounded-lg bg-background" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" className="w-full px-3 py-2 border border-border rounded-lg bg-background"></textarea>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm">
                  <strong>Note:</strong> Maintenance costs are automatically calculated from the Vehicle Maintenance module and should not be entered here.
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowExpenseModal(false)} className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg font-medium">Cancel</button>
                  <button type="submit" disabled={modalLoading} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-50">
                    {modalLoading ? 'Saving...' : 'Save Expense'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
