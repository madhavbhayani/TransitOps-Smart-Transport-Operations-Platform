import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Users,
  MapPin,
  Wrench,
  Fuel,
  LineChart,
  Settings
} from 'lucide-react';
import { apiClient } from '../../api_config/api_client';

export default function Sidebar() {
  const location = useLocation();
  const [permissions, setPermissions] = useState({});

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const response = await apiClient('/rbac/permissions');
        if (response.success && response.data) {
          setPermissions(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
      }
    };
    fetchPermissions();
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/console/dashboard', icon: LayoutDashboard, module: 'dashboard' },
    { name: 'Fleet', path: '/console/fleet', icon: Truck, module: 'fleet' },
    { name: 'Drivers', path: '/console/drivers', icon: Users, module: 'drivers' },
    { name: 'Trips', path: '/console/trips', icon: MapPin, module: 'trips' },
    { name: 'Maintenance', path: '/console/maintenance', icon: Wrench, module: 'maintenance' },
    { name: 'Fuel & Expenses', path: '/console/expenses', icon: Fuel, module: 'expenses' },
    { name: 'Analytics', path: '/console/analytics', icon: LineChart, module: 'analytics' },
    { name: 'Settings', path: '/console/settings', icon: Settings, module: 'settings' },
  ];

  const userStr = localStorage.getItem('transitops_user');
  const user = userStr ? JSON.parse(userStr) : null;
  const userRole = user?.role || '';
  const userRolePerms = permissions[userRole] || {};

  return (
    <div className="w-64 h-screen bg-surface border-r border-border flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-primary-500 p-2 rounded-lg">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-primary-600 dark:text-primary-500">
            TransitOps
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.filter(item => {
          if (userRole === 'ADMIN') return true;
          return userRolePerms[item.module] && userRolePerms[item.module] !== 'NONE';
        }).map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${isActive
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-semibold'
                : 'text-muted hover:bg-surface-hover hover:text-foreground'
                }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        {user && (
          <div className="mb-3 px-2">
            <p className="text-sm font-bold text-foreground truncate">{user.name}</p>
            {/* <p className="text-xs text-muted font-medium truncate">{user.role}</p> */}
          </div>
        )}
        <button
          onClick={() => {
            localStorage.removeItem('transitops_token');
            localStorage.removeItem('transitops_user');
            window.location.href = '/login';
          }}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
