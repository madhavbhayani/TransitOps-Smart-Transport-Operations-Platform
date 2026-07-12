import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Fuel, Receipt, AlertTriangle, X, CheckCircle, Ban, History } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { financeAPI } from '../../../api_config/FuelExpenses/finance_fuel_expense_api';

export default function FuelExpenseDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const type = location.pathname.includes('fuel') ? 'fuel' : 'expense';
  
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    fetchDetails();
  }, [id, type]);

  const fetchDetails = async () => {
    setLoading(true);
    try {
      if (type === 'fuel') {
        const res = await financeAPI.getFuelLogDetails(id);
        setData(res.fuelLog);
      } else {
        const res = await financeAPI.getExpenseDetails(id);
        setData(res.expense);
        setHistory(res.statusHistory || []);
      }
      setError(null);
    } catch (err) {
      setError(err.message || `Failed to fetch ${type} details`);
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async (e) => {
    e.preventDefault();
    if (!voidReason.trim()) return;
    
    setVoiding(true);
    try {
      if (type === 'fuel') {
        await financeAPI.voidFuelLog(id, voidReason);
      } else {
        await financeAPI.voidExpense(id, voidReason);
      }
      setShowVoidModal(false);
      fetchDetails();
    } catch (err) {
      alert(err.message || 'Failed to void record');
    } finally {
      setVoiding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted">Loading details...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 text-red-600 rounded-2xl border border-red-200 flex items-center gap-3">
        <AlertTriangle className="w-6 h-6" />
        <div>
          <h3 className="font-bold">Error</h3>
          <p>{error || 'Record not found'}</p>
        </div>
      </div>
    );
  }

  const isVoided = type === 'fuel' ? data.is_voided : data.status === 'VOIDED';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/console/expenses')}
          className="p-2 hover:bg-surface border border-transparent hover:border-border rounded-xl transition-all"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              {type === 'fuel' ? 'Fuel Log Details' : 'Expense Details'}
            </h1>
            <span className={`px-3 py-1 text-sm rounded-full font-medium ${
              isVoided 
                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50'
            }`}>
              {isVoided ? 'VOIDED' : 'VALID'}
            </span>
          </div>
          <p className="text-muted mt-1">Record ID #{data.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* Main Info */}
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              {type === 'fuel' ? <Fuel className="w-6 h-6 text-primary-500" /> : <Receipt className="w-6 h-6 text-primary-500" />}
              <h3 className="text-lg font-bold">Financial Summary</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <div className="text-sm text-muted mb-1">Date</div>
                <div className="font-medium text-lg">
                  {new Date(type === 'fuel' ? data.fuel_date : data.expense_date).toLocaleDateString()}
                </div>
              </div>
              
              {type === 'fuel' ? (
                <>
                  <div>
                    <div className="text-sm text-muted mb-1">Liters</div>
                    <div className="font-medium text-lg">{data.liters} L</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted mb-1">Cost</div>
                    <div className="font-medium text-lg text-red-400">₹{parseFloat(data.cost).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted mb-1">Odometer</div>
                    <div className="font-medium text-lg">{data.odometer ? `${data.odometer} km` : 'N/A'}</div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div className="text-sm text-muted mb-1">Type</div>
                    <div className="font-medium text-lg">{data.expense_type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted mb-1">Amount</div>
                    <div className="font-medium text-lg text-red-400">₹{parseFloat(data.amount).toLocaleString()}</div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="text-sm text-muted mb-2">Description / Notes</div>
              <p className="text-foreground">{data.notes || data.description || 'No additional notes provided.'}</p>
            </div>
          </div>

          {/* Void Info */}
          {isVoided && (
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <Ban className="w-6 h-6 text-red-500" />
                <h3 className="text-lg font-bold text-red-700 dark:text-red-400">Void Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-red-600 dark:text-red-500 mb-1">Voided By</div>
                  <div className="text-foreground">{data.voided_by_name || `User #${data.voided_by}`}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-red-600 dark:text-red-500 mb-1">Void Date</div>
                  <div className="text-foreground">{new Date(data.voided_at).toLocaleString()}</div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-sm font-medium text-red-600 dark:text-red-500 mb-1">Reason for Voiding</div>
                  <div className="text-foreground">{data.void_reason}</div>
                </div>
              </div>
            </div>
          )}

          {/* Status History (Expenses Only) */}
          {type === 'expense' && history.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                <History className="w-6 h-6 text-primary-500" />
                <h3 className="text-lg font-bold">Status History</h3>
              </div>
              <div className="space-y-4">
                {history.map((h, i) => (
                  <div key={h.id} className={`flex items-start gap-4 ${i !== history.length - 1 ? 'pb-4 border-b border-border' : ''}`}>
                    <div className="mt-1 w-2 h-2 rounded-full bg-primary-500"></div>
                    <div>
                      <div className="font-medium">
                        {h.previous_status ? `${h.previous_status} → ` : ''}{h.new_status}
                      </div>
                      <div className="text-sm text-muted mt-1">{h.reason}</div>
                      <div className="text-xs text-muted mt-2">
                        By {h.changed_by_name} on {new Date(h.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold mb-4">Link Details</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-muted mb-1">Vehicle</div>
                <div className="font-medium text-primary-500 cursor-pointer" onClick={() => navigate(`/console/fleet/${data.vehicle_id}`)}>
                  {data.registration_number}
                </div>
                <div className="text-xs text-muted mt-0.5">{data.vehicle_name}</div>
              </div>

              {data.trip_id && (
                <div className="pt-4 border-t border-border">
                  <div className="text-sm text-muted mb-1">Trip</div>
                  <div className="font-medium text-primary-500 cursor-pointer" onClick={() => navigate(`/console/trips/${data.trip_id}`)}>
                    Trip #{data.trip_id}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{data.trip_source} → {data.trip_destination}</div>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <div className="text-sm text-muted mb-1">Recorded By</div>
                <div className="font-medium">{data.recorded_by_name || `User #${data.recorded_by}`}</div>
                <div className="text-xs text-muted mt-0.5">{new Date(data.created_at).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {!isVoided && (
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold mb-4">Actions</h3>
              <p className="text-sm text-muted mb-4">
                Voiding a record removes it from financial analytics (Operational Cost, ROI, etc.). This action cannot be fully undone as it leaves an audit trail.
              </p>
              <button 
                onClick={() => setShowVoidModal(true)}
                className="w-full px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-xl font-medium transition-colors border border-red-200 dark:border-red-800/50"
              >
                Void Record
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Void Modal */}
      <AnimatePresence>
        {showVoidModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-red-50 dark:bg-red-900/10">
                <h3 className="text-xl font-bold flex items-center gap-2 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                  Void Record
                </h3>
                <button onClick={() => setShowVoidModal(false)} className="text-red-400 hover:text-red-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleVoid} className="p-6 space-y-4">
                <p className="text-sm text-muted">
                  Are you sure you want to void this record? It will no longer be counted in financial calculations. You must provide a reason.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-red-600 dark:text-red-400">Reason for Voiding *</label>
                  <textarea 
                    required
                    value={voidReason}
                    onChange={(e) => setVoidReason(e.target.value)}
                    rows="3" 
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="E.g., Duplicate entry, incorrect amount..."
                  ></textarea>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowVoidModal(false)} className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border rounded-lg font-medium">Cancel</button>
                  <button type="submit" disabled={voiding} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50">
                    {voiding ? 'Voiding...' : 'Confirm Void'}
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
