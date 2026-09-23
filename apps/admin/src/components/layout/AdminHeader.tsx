import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, ShieldCheck } from 'lucide-react';
import { Button } from '../common/Button';

export const AdminHeader: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-admin-900 border-b border-admin-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Status Pill */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Platform Operational &bull; Production Engine Live</span>
        </div>
      </div>

      {/* Admin Profile & Logout */}
      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white">{user.name}</p>
              <p className="text-[10px] text-admin-400">{user.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-terracotta-600 text-white font-bold text-xs flex items-center justify-center border border-terracotta-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
        >
          Sign Out
        </Button>
      </div>
    </header>
  );
};
