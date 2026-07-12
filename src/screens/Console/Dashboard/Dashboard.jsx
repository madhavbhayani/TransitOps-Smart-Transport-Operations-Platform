import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { dashboardAPI } from '../../../api_config/Dashboard/Dashboard_api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line
} from 'recharts';
import { Truck, MapPin, AlertTriangle, Wrench } from 'lucide-react';

export default function Dashboard() {
  const userStr = localStorage.getItem('transitops_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [stats, setStats] = useState({
    activeVehicles: 0,
    activeTrips: 0,
    currentMaintenance: 0,
    alerts: 0
  });
  
  const [opCostData, setOpCostData] = useState(null);
  const [profitabilityData, setProfitabilityData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch generic stats for everyone
      const statsRes = await dashboardAPI.getStats();
      if (statsRes) {
        setStats(statsRes);
      }

      // Fetch charts (gracefully handles 403 errors by returning null inside the API wrapper)
      const [opCostRes, profitRes] = await Promise.all([
        dashboardAPI.getOperationalCostChart(),
        dashboardAPI.getMonthlyProfitabilityChart()
      ]);

      if (opCostRes && opCostRes.vehicles) {
        setOpCostData(opCostRes.vehicles);
      }
      if (profitRes && profitRes.months) {
        setProfitabilityData(profitRes.months);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return `₹${val.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8 w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted">Welcome back, {user?.name || 'User'} ({user?.role})</p>
      </div>
      
      {/* KPI Stats - Visible to all roles */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard title="Active Vehicles" value={stats.activeVehicles} icon={Truck} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" />
        <StatCard title="Active Trips" value={stats.activeTrips} icon={MapPin} color="text-green-500" bg="bg-green-50 dark:bg-green-500/10" />
        <StatCard title="Current Maintenance" value={stats.currentMaintenance} icon={Wrench} color="text-orange-500" bg="bg-orange-50 dark:bg-orange-500/10" />
        <StatCard title="Alerts (In Shop)" value={stats.alerts} icon={AlertTriangle} color="text-red-500" bg="bg-red-50 dark:bg-red-500/10" />
      </motion.div>

      {/* Charts - Visible only to those with permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Operational Cost Breakdown */}
        {opCostData && (
          <ChartCard title="Operational Cost Breakdown">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={opCostData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="registrationNumber" tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="fuelCost" name="Fuel Cost" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                <Bar dataKey="maintenanceCost" name="Maintenance" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Monthly Profitability Trend */}
        {profitabilityData && (
          <ChartCard title="Monthly Profitability Trend">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={profitabilityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="monthName" tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                  formatter={(value) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="operationalCost" name="Operational Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

      </div>
    </div>
  );
}

// Subcomponents
function StatCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between">
      <div>
        <h3 className="text-sm font-medium text-muted mb-1">{title}</h3>
        <p className={`text-3xl font-bold ${color === 'text-red-500' && value > 0 ? color : 'text-foreground'}`}>{value}</p>
      </div>
      <div className={`p-4 rounded-full ${bg}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="bg-surface p-6 rounded-2xl border border-border shadow-sm"
    >
      <h3 className="text-lg font-semibold text-foreground mb-6">{title}</h3>
      {children}
    </motion.div>
  );
}
