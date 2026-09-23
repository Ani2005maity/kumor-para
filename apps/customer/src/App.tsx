import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';

import { HomePage } from './pages/home/HomePage';
import { CatalogPage } from './pages/catalog/CatalogPage';
import { ProductDetailPage } from './pages/product/ProductDetailPage';
import { ShopPage } from './pages/shop/ShopPage';
import { CheckoutPage } from './pages/checkout/CheckoutPage';
import { OrderSuccessPage } from './pages/checkout/OrderSuccessPage';
import { OrdersHistoryPage } from './pages/account/OrdersHistoryPage';
import { CustomerLoginPage } from './pages/auth/CustomerLoginPage';
import { CustomerRegisterPage } from './pages/auth/CustomerRegisterPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2, // 2 minutes
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
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/catalog" element={<CatalogPage />} />
              <Route path="/product/:slug" element={<ProductDetailPage />} />
              <Route path="/shop/:slug" element={<ShopPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-success/:orderId" element={<OrderSuccessPage />} />
              <Route path="/orders" element={<OrdersHistoryPage />} />
              <Route path="/login" element={<CustomerLoginPage />} />
              <Route path="/register" element={<CustomerRegisterPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
