import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  ReceiptText,
  Settings,
  Store,
  LogOut,
  Sparkles,
  ExternalLink,
  Sun,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import { cn } from '../../lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
  pendingOrdersCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  pendingOrdersCount = 0,
}) => {
  const { user, seller, logout } = useAuth();

  const navItems = [
    {
      label: 'Studio Overview',
      to: '/',
      icon: LayoutDashboard,
    },
    {
      label: 'Products & Inventory',
      to: '/products',
      icon: Package,
    },
    {
      label: 'Orders Pipeline',
      to: '/orders',
      icon: ShoppingBag,
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined,
    },
    {
      label: 'Invoices & GST',
      to: '/invoices',
      icon: ReceiptText,
    },
    {
      label: 'Shop Settings',
      to: '/settings',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-charcoal-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-72 bg-[#FCFAF7] border-r border-stone-warm-200/90 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-stone-warm-200/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-terracotta-500 text-white flex items-center justify-center shadow-warm-md">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-bold text-lg text-charcoal-900 tracking-tight">
                  Kumor Para
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-terracotta-100 text-terracotta-800 text-[10px] font-bold uppercase tracking-wide">
                  Artisan
                </span>
              </div>
              <p className="text-xs text-stone-warm-600 truncate max-w-[170px]">
                {seller?.shopName || 'Creator Studio'}
              </p>
            </div>
          </div>
        </div>

        {/* Seller Status Card */}
        {seller && (
          <div className="px-4 py-3 mx-4 my-3 rounded-2xl bg-white border border-stone-warm-200/80 shadow-warm-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-charcoal-700">Studio Status</span>
              <Badge status={seller.status} size="sm" dot />
            </div>
            {seller.status === 'pending' && (
              <p className="mt-1 text-[11px] text-amber-700 leading-tight">
                Profile is under review by Kumor Para curation team.
              </p>
            )}
            {seller.isVacationMode && (
              <div className="mt-2 py-0.5 px-2 rounded-lg bg-stone-warm-200 text-stone-warm-800 text-[11px] font-medium flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-stone-warm-700" />
                <span>Vacation Mode Active</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-terracotta-500 text-white shadow-warm-sm font-semibold'
                    : 'text-charcoal-700 hover:bg-stone-warm-200/70 hover:text-charcoal-900'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        'w-4 h-4 transition-colors',
                        isActive ? 'text-white' : 'text-stone-warm-500'
                      )}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-bold',
                        isActive
                          ? 'bg-white text-terracotta-700'
                          : 'bg-terracotta-500 text-white'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Creator Shop Link & Quick Tip */}
        <div className="p-4 mx-4 mb-3 rounded-2xl bg-radial-craft border border-terracotta-200/60 text-xs text-charcoal-800 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-terracotta-800">
            <Sparkles className="w-3.5 h-3.5 text-terracotta-500" />
            <span>Handmade Certified</span>
          </div>
          <p className="text-[11px] text-stone-warm-700 leading-snug">
            Your studio showcases authentic, slow-crafted goods to patrons worldwide.
          </p>
        </div>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-stone-warm-200/70 bg-stone-warm-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-terracotta-200 text-terracotta-900 font-bold flex items-center justify-center text-xs shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-charcoal-900 truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-stone-warm-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign out of artisan portal"
              className="p-1.5 text-stone-warm-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
