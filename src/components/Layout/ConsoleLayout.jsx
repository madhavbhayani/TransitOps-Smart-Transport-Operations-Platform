import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';

export default function ConsoleLayout() {
  const token = localStorage.getItem('transitops_token');
  
  // Basic protected route
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-bg-color dark:bg-[#020617] text-foreground">
      <Sidebar />
      <div className="pl-64 flex flex-col min-h-screen">
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
