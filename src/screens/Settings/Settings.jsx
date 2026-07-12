import React, { useState, useEffect } from 'react';
import { Moon, Sun, Monitor, Settings as SettingsIcon, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '../../api_config/api_client';

export default function Settings() {
  const [theme, setTheme] = useState('system');
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  const userStr = localStorage.getItem('transitops_user');
  const user = userStr ? JSON.parse(userStr) : { name: 'User', role: 'ROLE' };
  const isAdmin = user.role === 'ADMIN';

  useEffect(() => {
    const savedTheme = localStorage.getItem('transitops_theme') || 'system';
    setTheme(savedTheme);

    const fetchPermissions = async () => {
      try {
        const res = await apiClient('/rbac/permissions');
        if (res.success) {
          setPermissions(res.data);
        }
      } catch (err) {
        console.error('Failed to load permissions', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPermissions();
  }, []);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    if (newTheme === 'system') {
      localStorage.removeItem('transitops_theme');
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      localStorage.setItem('transitops_theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handlePermissionChange = async (role, module, newLevel) => {
    if (!isAdmin || role === 'ADMIN') return;
    
    // Optimistic update
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: newLevel
      }
    }));

    try {
      await apiClient('/rbac/permissions', {
        method: 'PUT',
        body: JSON.stringify({ role, module, access_level: newLevel })
      });
    } catch (err) {
      console.error('Failed to update permission', err);
      // Ideally rollback optimistic update here if failed
    }
  };

  const modules = ['dashboard', 'fleet', 'drivers', 'trips', 'maintenance', 'expenses', 'analytics', 'settings'];
  const roles = Object.keys(permissions).filter(r => r !== 'ADMIN'); // Exclude admin from matrix to keep it clean

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary-500" />
            Settings
          </h1>
          <p className="text-muted">Manage your preferences and application settings.</p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* Appearance Section */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-background/50">
            <h3 className="font-semibold text-foreground">Appearance</h3>
            <p className="text-sm text-muted">Customize the look and feel of TransitOps.</p>
          </div>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="font-medium text-foreground">Theme Preference</h4>
                <p className="text-sm text-muted">Select your preferred color scheme.</p>
              </div>
              <div className="flex items-center gap-2 bg-background p-1.5 rounded-xl border border-border">
                <button 
                  onClick={() => handleThemeChange('light')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'light' ? 'bg-surface shadow-sm text-foreground' : 'text-muted hover:text-foreground'}`}
                >
                  <Sun className="w-4 h-4" /> Light
                </button>
                <button 
                  onClick={() => handleThemeChange('dark')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-surface shadow-sm text-foreground' : 'text-muted hover:text-foreground'}`}
                >
                  <Moon className="w-4 h-4" /> Dark
                </button>
                <button 
                  onClick={() => handleThemeChange('system')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'system' ? 'bg-surface shadow-sm text-foreground' : 'text-muted hover:text-foreground'}`}
                >
                  <Monitor className="w-4 h-4" /> System
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RBAC Section */}
        <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border bg-background/50 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-500" /> 
                Role-Based Access Control (RBAC)
              </h3>
              <p className="text-sm text-muted">Review {isAdmin && 'and modify '} role permissions across modules.</p>
            </div>
            {!isAdmin && (
              <span className="px-3 py-1 bg-background border border-border rounded-full text-xs font-medium text-muted">
                Read Only
              </span>
            )}
          </div>
          <div className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-muted">Loading permissions...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-background/50 border-b border-border">
                    <th className="p-4 font-medium text-sm text-muted sticky left-0 bg-surface z-10 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#374151]">Role</th>
                    {modules.map(mod => (
                      <th key={mod} className="p-4 font-medium text-sm text-muted capitalize whitespace-nowrap">{mod}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {roles.map(role => (
                    <tr key={role} className="hover:bg-background/50 transition-colors">
                      <td className="p-4 font-semibold text-sm text-foreground sticky left-0 bg-surface z-10 shadow-[1px_0_0_0_#e5e7eb] dark:shadow-[1px_0_0_0_#374151] whitespace-nowrap">
                        {role.replace('_', ' ')}
                      </td>
                      {modules.map(mod => {
                        const level = permissions[role]?.[mod] || 'NONE';
                        return (
                          <td key={`${role}-${mod}`} className="p-4">
                            {isAdmin ? (
                              <select 
                                value={level}
                                onChange={(e) => handlePermissionChange(role, mod, e.target.value)}
                                className={`text-xs font-medium px-2 py-1.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary-500/50 w-full ${
                                  level === 'FULL_CONTROL' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' :
                                  level === 'VIEW' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' :
                                  'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50'
                                }`}
                              >
                                <option value="NONE">None</option>
                                <option value="VIEW">View</option>
                                <option value="FULL_CONTROL">Full Control</option>
                              </select>
                            ) : (
                              <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium border ${
                                level === 'FULL_CONTROL' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' :
                                level === 'VIEW' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/50' :
                                'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-700/50'
                              }`}>
                                {level.replace('_', ' ')}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </motion.div>
  );
}
