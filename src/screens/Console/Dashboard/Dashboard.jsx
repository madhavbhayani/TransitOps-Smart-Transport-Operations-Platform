import React from 'react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const userStr = localStorage.getItem('transitops_user');
  const user = userStr ? JSON.parse(userStr) : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-muted mb-8">Welcome back, {user?.name || 'User'} ({user?.role})</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted mb-1">Active Vehicles</h3>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted mb-1">Active Trips</h3>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm">
          <h3 className="text-sm font-medium text-muted mb-1">Alerts</h3>
          <p className="text-3xl font-bold text-red-500">0</p>
        </div>
      </div>
    </motion.div>
  );
}
