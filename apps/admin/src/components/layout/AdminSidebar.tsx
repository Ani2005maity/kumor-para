import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Package,
  Layers,
  ShoppingBag,
  FileText,
  Sliders,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Store,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const AdminSidebar: React.FC = () => {
  const { data: overviewData } = useQuery<{
    kpis?: {
      pendingSellersCount: number;
      pendingProductsCount: number;
    };
  }>({
    queryKey: ['admin-overview-counts'],
    queryFn: () => api.get('/admin/overview'),
  });

  const pendingSellers = overviewData?.kpis?.pendingSellersCount ?? 0;
  const pendingProducts = overviewData?.kpis?.pendingProductsCount ?? 0;

  const navItems = [
    { label: 'Overview', to: '/', icon: LayoutDashboard, exact: true },
    {
      label: 'Seller Applications',
      to: '/sellers',
      icon: Users,
      badge: pendingSellers > 0 ? pendingSellers : undefined,
    },
    {
      label: 'Product Moderation',
      to: '/products',
      icon: Package,
      badge: pendingProducts > 0 ? pendingProducts : undefined,
    },
    { label: 'Craft Categories', to: '/categories', icon: Layers },
    { label: 'Orders Oversight', to: '/orders', icon: ShoppingBag },
    { label: 'Invoices Register', to: '/invoices', icon: FileText },
    { label: 'Settings & Audit', to: '/settings', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-admin-900 border-r border-admin-800 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-admin-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-terracotta-600 flex items-center justify-center text-white shadow-admin-sm">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display font-black text-base text-white tracking-tight">
            Kumor<span className="text-terracotta-500">Para</span>
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-admin-400">
            Admin Console
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-admin-500">
          Core Operations
        </p>

        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              cn(
                'flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group',
                isActive
                  ? 'bg-terracotta-600 text-white shadow-admin-sm'
                  : 'text-admin-400 hover:text-white hover:bg-admin-800'
              )
            }
          >
            <div className="flex items-center gap-2.5">
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </div>

      {/* Quick App Portals Footer */}
      <div className="p-4 border-t border-admin-800 space-y-2 bg-admin-950/40">
        <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-admin-500">
          Ecosystem Frontends
        </p>

        <a
          href={import.meta.env.VITE_CUSTOMER_URL || 'http://localhost:5173'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-admin-400 hover:text-white hover:bg-admin-800 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-terracotta-400" />
            <span>Customer Marketplace</span>
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-admin-500" />
        </a>

        <a
          href={import.meta.env.VITE_SELLER_URL || 'http://localhost:5174'}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-admin-400 hover:text-white hover:bg-admin-800 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Store className="w-3.5 h-3.5 text-terracotta-400" />
            <span>Seller Studio</span>
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-admin-500" />
        </a>
      </div>
    </aside>
  );
};
