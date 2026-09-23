import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { ProductModal } from '../../pages/products/ProductModal';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';

export const AppLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const location = useLocation();

  // Fetch pending orders count for badge
  const { data: ordersData } = useQuery({
    queryKey: ['seller-orders-pending-count'],
    queryFn: () => api.get<{ orders: any[]; total: number }>('/orders/seller/list?status=new'),
    staleTime: 1000 * 30, // 30s
  });

  const pendingOrdersCount = ordersData?.total || 0;

  // Determine header title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Studio Overview';
    if (path.startsWith('/products')) return 'Handmade Creations & Inventory';
    if (path.startsWith('/orders')) return 'Order Fulfillment Pipeline';
    if (path.startsWith('/invoices')) return 'Invoices & Payouts';
    if (path.startsWith('/settings')) return 'Studio Settings & Profile';
    return 'Artisan Dashboard';
  };

  return (
    <div className="min-h-screen bg-stone-warm-100 flex">
      {/* Sidebar */}
      <Sidebar
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        pendingOrdersCount={pendingOrdersCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          title={getPageTitle()}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenAddProduct={() => setIsAddProductOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Add Product Modal */}
      <ProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
      />
    </div>
  );
};
