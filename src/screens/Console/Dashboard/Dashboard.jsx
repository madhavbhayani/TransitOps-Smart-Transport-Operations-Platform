import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { dashboardAPI } from '../../../api_config/Dashboard/Dashboard_api';
import { apiClient } from '../../../api_config/api_client';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  Truck, MapPin, AlertTriangle, Wrench, CheckCircle, Clock, Users, Percent, Filter
} from 'lucide-react';

export default function Dashboard() {
  const userStr = localStorage.getItem('transitops_user');
  const user = userStr ? JSON.parse(userStr) : null;

  const [stats, setStats] = useState({
    activeVehicles: 0,
    availableVehicles: 0,
    maintenanceVehicles: 0,
    activeTrips: 0,
    pendingTrips: 0,
    driversOnDuty: 0,
    fleetUtilization: 0,
    vehicleStatusBreakdown: {
      AVAILABLE: 0,
      ON_TRIP: 0,
      IN_SHOP: 0,
      RETIRED: 0
    }
  });
  
  const [opCostData, setOpCostData] = useState(null);
  const [profitabilityData, setProfitabilityData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    vehicleType: '',
    status: '',
    region: ''
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Build query string for stats
      const queryParams = new URLSearchParams();
      if (filters.vehicleType) queryParams.append('vehicleType', filters.vehicleType);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.region) queryParams.append('region', filters.region);
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

      // Fetch generic stats using apiClient instead of dashboardAPI to pass queryString easily
      const statsRes = await apiClient(`/dashboard/stats${queryString}`);
      if (statsRes && statsRes.success) {
        setStats(statsRes.data);
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
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return `₹${val.toLocaleString('en-IN')}`;
  };

  if (loading && !stats.activeVehicles && !opCostData) {
    return (
      <div className="p-8 flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Format data for PieChart
  const pieData = Object.entries(stats.vehicleStatusBreakdown || {}).map(([key, value]) => ({
    name: key.replace('_', ' '),
    value
  })).filter(item => item.value > 0);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#6b7280']; // Green, Blue, Orange, Gray

  return (
    <div className="p-8 w-full space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted">Welcome back, {user?.name || 'User'} ({user?.role})</p>
        </div>
        
        {/* Filters Bar */}
        <div className="flex items-center gap-3 bg-surface p-2 rounded-xl border border-border shadow-sm">
          <Filter className="w-5 h-5 text-muted ml-2" />
          <select 
            name="vehicleType" 
            value={filters.vehicleType} 
            onChange={handleFilterChange}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary-500 text-foreground"
          >
            <option value="">All Types</option>
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Bus">Bus</option>
          </select>
          <select 
            name="status" 
            value={filters.status} 
            onChange={handleFilterChange}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary-500 text-foreground"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="IN_SHOP">In Shop</option>
          </select>
          <input 
            type="text" 
            name="region" 
            value={filters.region} 
            onChange={handleFilterChange} 
            placeholder="Region (City)"
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary-500 w-32 text-foreground"
          />
        </div>
      </div>
      
      {/* KPI Stats - Visible to all roles */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard title="Active Vehicles" value={stats.activeVehicles} icon={Truck} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" />
        <StatCard title="Available Vehicles" value={stats.availableVehicles} icon={CheckCircle} color="text-green-500" bg="bg-green-50 dark:bg-green-500/10" />
        <StatCard title="In Maintenance" value={stats.maintenanceVehicles} icon={Wrench} color="text-orange-500" bg="bg-orange-50 dark:bg-orange-500/10" />
        <StatCard title="Fleet Utilization" value={`${stats.fleetUtilization}%`} icon={Percent} color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" />
        
        <StatCard title="Active Trips" value={stats.activeTrips} icon={MapPin} color="text-teal-500" bg="bg-teal-50 dark:bg-teal-500/10" />
        <StatCard title="Pending Trips" value={stats.pendingTrips} icon={Clock} color="text-yellow-500" bg="bg-yellow-50 dark:bg-yellow-500/10" />
        <StatCard title="Drivers on Duty" value={stats.driversOnDuty} icon={Users} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-500/10" />
        <StatCard title="Alerts (In Shop)" value={stats.maintenanceVehicles} icon={AlertTriangle} color="text-red-500" bg="bg-red-50 dark:bg-red-500/10" />
      </motion.div>

      {/* Charts - Visible only to those with permissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Vehicle Status Breakdown */}
        <ChartCard title="Vehicle Status">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.5rem' }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Operational Cost Breakdown */}
        {opCostData && (
          <div className="lg:col-span-2">
            <ChartCard title="Operational Cost Breakdown">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={opCostData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="registrationNumber" tick={{fill: '#9ca3af', fontSize: 12}} />
                  <YAxis tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.5rem' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="fuelCost" name="Fuel Cost" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="maintenanceCost" name="Maintenance" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {/* Monthly Profitability Trend */}
        {profitabilityData && (
          <div className="lg:col-span-3">
            <ChartCard title="Monthly Profitability Trend">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={profitabilityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                  <XAxis dataKey="monthName" tick={{fill: '#9ca3af', fontSize: 12}} />
                  <YAxis tick={{fill: '#9ca3af', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.5rem' }}
                    formatter={(value) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="operationalCost" name="Operational Cost" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="profit" name="Profit" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

      </div>
    </div>
  );
}

// Subcomponents
function StatCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-center justify-between transition-transform hover:-translate-y-1 hover:shadow-md">
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
      className="bg-surface p-6 rounded-2xl border border-border shadow-sm h-full"
    >
      <h3 className="text-lg font-semibold text-foreground mb-6">{title}</h3>
      {children}
    </motion.div>
  );
}
