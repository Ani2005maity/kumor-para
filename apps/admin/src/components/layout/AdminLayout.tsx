import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

export const AdminLayout: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-admin-950 flex items-center justify-center text-admin-400 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-terracotta-500 animate-ping" />
          <span>Verifying Administrator Session...</span>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex bg-admin-950 text-admin-100 font-sans antialiased selection:bg-terracotta-900 selection:text-terracotta-200">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
