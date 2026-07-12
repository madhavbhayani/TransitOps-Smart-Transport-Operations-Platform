import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart, Area
} from 'recharts';
import { 
  Download, TrendingUp, DollarSign, Activity, Fuel, Truck, AlertCircle, Calendar 
} from 'lucide-react';
import { analyticsAPI } from '../../../api_config/Analytics/analytics_api_service';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AnalyticsScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());

  // Data States
  const [overview, setOverview] = useState(null);
  const [fuelEfficiency, setFuelEfficiency] = useState([]);
  const [utilization, setUtilization] = useState([]);
  const [opCost, setOpCost] = useState([]);
  const [monthlyProfits, setMonthlyProfits] = useState([]);
  const [costliestVehicles, setCostliestVehicles] = useState([]);
  const [vehicleRoi, setVehicleRoi] = useState([]);
  const [tripProfit, setTripProfit] = useState([]);

  // Auth check for overview (Analyst only)
  const userStr = localStorage.getItem('transitops_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isAnalyst = user?.role === 'FINANCIAL_ANALYST';

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      // Fetch all required data in parallel
      const [
        effRes,
        utilRes,
        opRes,
        costliestRes,
        roiRes,
        tripProfRes
      ] = await Promise.all([
        analyticsAPI.getFuelEfficiency(filters),
        analyticsAPI.getFleetUtilization(),
        analyticsAPI.getOperationalCost(filters),
        analyticsAPI.getTopCostliestVehicles({ ...filters, limit: 5 }),
        analyticsAPI.getVehicleROI(filters),
        analyticsAPI.getTripProfitability({ ...filters, limit: 10 })
      ]);

      setFuelEfficiency(effRes.vehicles || []);
      setUtilization(utilRes.statusDistribution || []);
      setOpCost(opRes.vehicles || []);
      setCostliestVehicles(costliestRes.vehicles || []);
      setVehicleRoi(roiRes.vehicles || []);
      setTripProfit(tripProfRes.trips || []);

      // Analyst only endpoints
      if (isAnalyst) {
        const [overviewRes, monthlyRes] = await Promise.all([
          analyticsAPI.getOverview(),
          analyticsAPI.getMonthlyProfitability(year)
        ]);
        setOverview(overviewRes.metrics);
        setMonthlyProfits(monthlyRes.months || []);
      }

    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, year, isAnalyst]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async (type) => {
    try {
      const filters = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;
      if (type === 'monthly-revenue' || type === 'monthly-profitability') filters.year = year;
      
      await analyticsAPI.exportCSV(type, filters);
    } catch (err) {
      alert(err.message || 'Failed to export CSV');
    }
  };

  const formatCurrency = (val) => {
    if (val === null || val === undefined) return 'N/A';
    return `₹${val.toLocaleString('en-IN')}`;
  };

  if (loading && !overview && fuelEfficiency.length === 0) {
    return (
      <div className="p-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
      {/* Header & Controls */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Financial Intelligence</h1>
          <p className="text-muted">Real-time operational & financial metrics.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border">
            <Calendar className="w-4 h-4 text-muted" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-sm text-foreground focus:outline-none"
            />
            <span className="text-muted">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-sm text-foreground focus:outline-none"
            />
          </div>
          
          {isAnalyst && (
            <select 
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="bg-background text-foreground border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          )}

          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Export Reports
            </button>
            <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
              <button onClick={() => handleExport('operational-cost')} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-hover text-foreground">Operational Cost</button>
              <button onClick={() => handleExport('fuel-efficiency')} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-hover text-foreground">Fuel Efficiency</button>
              <button onClick={() => handleExport('vehicle-roi')} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-hover text-foreground">Vehicle ROI</button>
              <button onClick={() => handleExport('top-costliest-vehicles')} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-hover text-foreground">Top Costliest</button>
              <button onClick={() => handleExport('trip-profitability')} className="w-full text-left px-4 py-2 text-sm hover:bg-surface-hover text-foreground">Trip Profitability</button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* KPI Overview (Analyst Only) */}
      {isAnalyst && overview && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
        >
          <KpiCard title="Total Revenue" value={formatCurrency(overview.totalRevenue)} icon={DollarSign} color="text-green-500" bg="bg-green-50 dark:bg-green-500/10" />
          <KpiCard title="Total Op Cost" value={formatCurrency(overview.totalOperationalCost)} icon={Activity} color="text-red-500" bg="bg-red-50 dark:bg-red-500/10" />
          <KpiCard title="Total Profit" value={formatCurrency(overview.totalProfit)} icon={TrendingUp} color="text-blue-500" bg="bg-blue-50 dark:bg-blue-500/10" />
          <KpiCard title="Fleet Efficiency" value={`${overview.fleetFuelEfficiency || 'N/A'} KM/L`} icon={Fuel} color="text-yellow-500" bg="bg-yellow-50 dark:bg-yellow-500/10" />
          <KpiCard title="Fleet Utilized" value={`${overview.fleetUtilizationPercentage || 0}%`} icon={Truck} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-500/10" />
          <KpiCard title="Avg Fleet ROI" value={`${overview.averageVehicleRoiPercentage || 'N/A'}%`} icon={TrendingUp} color="text-indigo-500" bg="bg-indigo-50 dark:bg-indigo-500/10" />
        </motion.div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Operational Cost Stacked Bar */}
        <ChartCard title="Operational Cost Breakdown">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={opCost} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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

        {/* Monthly Profitability (Analyst Only) */}
        {isAnalyst && (
          <ChartCard title="Monthly Profitability Trend">
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={monthlyProfits} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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

        {/* Fuel Efficiency */}
        <ChartCard title="Vehicle Fuel Efficiency (KM/L)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={fuelEfficiency} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="registrationNumber" tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis tick={{fill: '#9ca3af', fontSize: 12}} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
              <Bar dataKey="fuelEfficiency" name="Efficiency (KM/L)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Fleet Utilization Doughnut */}
        <ChartCard title="Current Fleet Utilization">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={utilization}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="count"
                nameKey="status"
              >
                {utilization.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top Costliest Vehicles */}
        <ChartCard title="Top 5 Costliest Vehicles">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart layout="vertical" data={costliestVehicles} margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis dataKey="registrationNumber" type="category" tick={{fill: '#9ca3af', fontSize: 12}} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                formatter={(value) => formatCurrency(value)}
              />
              <Bar dataKey="operationalCost" name="Operational Cost" fill="#ef4444" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Vehicle ROI */}
        <ChartCard title="Vehicle Return on Investment (%)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={vehicleRoi} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="registrationNumber" tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis tick={{fill: '#9ca3af', fontSize: 12}} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
              <Bar dataKey="roiPercentage" name="ROI %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </motion.div>
  );
}

// Subcomponents
function KpiCard({ title, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col justify-center">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <p className="text-muted text-sm font-medium">{title}</p>
      </div>
      <h3 className="text-2xl font-bold text-foreground">{value}</h3>
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
