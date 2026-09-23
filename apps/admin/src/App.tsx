import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AdminLayout } from './components/layout/AdminLayout';

import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { OverviewPage } from './pages/overview/OverviewPage';
import { SellersModerationPage } from './pages/sellers/SellersModerationPage';
import { ProductsModerationPage } from './pages/products/ProductsModerationPage';
import { CategoriesPage } from './pages/categories/CategoriesPage';
import { OrdersOversightPage } from './pages/orders/OrdersOversightPage';
import { InvoicesRegisterPage } from './pages/invoices/InvoicesRegisterPage';
import { SettingsAuditPage } from './pages/settings/SettingsAuditPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 mins
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AdminLoginPage />} />
            <Route element={<AdminLayout />}>
              <Route path="/" element={<OverviewPage />} />
              <Route path="/sellers" element={<SellersModerationPage />} />
              <Route path="/products" element={<ProductsModerationPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/orders" element={<OrdersOversightPage />} />
              <Route path="/invoices" element={<InvoicesRegisterPage />} />
              <Route path="/settings" element={<SettingsAuditPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
