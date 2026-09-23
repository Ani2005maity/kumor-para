import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ProductModal } from '../products/ProductModal';
import { OrderDetailModal } from '../orders/OrderDetailModal';
import { useToast } from '../../components/common/Toast';
import { formatINR } from '../../lib/utils';
import {
  IndianRupee,
  ShoppingBag,
  Package,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Clock,
  Truck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface SellerOrder {
  _id: string;
  sellerOrderNumber?: string;
  orderId?: { orderNumber?: string; [key: string]: any } | any;
  subtotal: number;
  sellerPayout: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
  items: Array<{
    title: string;
    image?: string;
    price: number;
    quantity: number;
    subtotal: number;
    customisationNote?: string;
  }>;
  shippingAddress?: any;
  [key: string]: any;
}

export const DashboardPage: React.FC = () => {
  const { user, seller } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

  // Fetch Seller's Products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => api.get<{ products: any[]; total: number }>('/products/seller/mine'),
  });

  // Fetch Seller's Orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery<{ orders: SellerOrder[]; total: number }>({
    queryKey: ['seller-orders'],
    queryFn: () => api.get<{ orders: SellerOrder[]; total: number }>('/orders/seller/list'),
  });

  // Fetch Invoices
  const { data: invoicesData } = useQuery({
    queryKey: ['seller-invoices'],
    queryFn: () => api.get<{ invoices: any[] }>('/invoices/seller/my-invoices'),
  });

  const products = productsData?.products || [];
  const orders: SellerOrder[] = ordersData?.orders || (ordersData as any)?.sellerOrders || [];
  const invoices = invoicesData?.invoices || [];

  // Calculate high-level KPIs
  const totalGMVPaise = orders.reduce((sum: number, o: SellerOrder) => sum + (o.subtotal || 0), 0);
  const totalPayoutPaise = orders.reduce((sum: number, o: SellerOrder) => sum + (o.sellerPayout || 0), 0);
  const pendingOrders = orders.filter((o: SellerOrder) => ['new', 'accepted', 'preparing', 'ready_for_pickup'].includes(o.status));
  const activeProducts = products.filter((p: any) => p.status === 'approved');
  const lowStockProducts = products.filter((p: any) => p.stock <= 3 && p.status === 'approved');

  // Status transition mutation for quick inline advancement
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, nextStatus, courier }: { orderId: string; nextStatus: string; courier?: any }) => {
      return api.patch(`/orders/seller/item/${orderId}/status`, {
        status: nextStatus,
        ...courier,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders-pending-count'] });
      toast.success('Order Updated', 'The order status has advanced to the next fulfillment stage.');
    },
    onError: (err: any) => {
      toast.error('Update Failed', err.message || 'Could not update order status.');
    },
  });

  const handleQuickAdvance = (order: any) => {
    let nextStatus = '';
    if (order.status === 'new') nextStatus = 'accepted';
    else if (order.status === 'accepted') nextStatus = 'preparing';
    else if (order.status === 'preparing') nextStatus = 'ready_for_pickup';
    else if (order.status === 'ready_for_pickup') {
      setSelectedOrder(order); // open modal to enter courier details
      return;
    } else if (order.status === 'shipped') nextStatus = 'delivered';

    if (nextStatus) {
      updateStatusMutation.mutate({ orderId: order._id, nextStatus });
    }
  };

  // Quick stock replenishment mutation
  const replenishStockMutation = useMutation({
    mutationFn: async ({ productId, newStock }: { productId: string; newStock: number }) => {
      return api.patch(`/products/${productId}/stock`, { stock: newStock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Inventory Replenished', 'Product stock has been updated.');
    },
    onError: (err: any) => {
      toast.error('Stock Update Failed', err.message);
    },
  });

  return (
    <div className="space-y-8">
      {/* Studio Greeting Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-radial-craft border border-stone-warm-200/90 p-6 sm:p-8 shadow-warm-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-terracotta-100 text-terracotta-800 text-xs font-bold uppercase tracking-wider">
                Artisan Studio Portal
              </span>
              {seller && <Badge status={seller.status} size="sm" dot />}
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-charcoal-900">
              Namaste, {seller?.shopName || user?.name}!
            </h1>
            <p className="text-sm text-stone-warm-700 max-w-2xl">
              {seller?.craftSpecialization
                ? `Crafting authentic ${seller.craftSpecialization} for patrons worldwide.`
                : 'Manage your handcrafted catalog, process patron orders, and review payments.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setIsAddProductOpen(true)}
              variant="primary"
              size="md"
              className="shadow-warm-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Creation</span>
            </Button>
            <Link to="/orders">
              <Button variant="outline" size="md">
                <ShoppingBag className="w-4 h-4" />
                <span>Manage Orders</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Gross Sales */}
        <Card className="hover:border-terracotta-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-warm-600 uppercase tracking-wider">
                Total Gross Sales
              </span>
              <div className="w-10 h-10 rounded-2xl bg-terracotta-50 text-terracotta-600 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-extrabold text-charcoal-900">
                {formatINR(totalGMVPaise)}
              </h3>
              <p className="mt-1 text-xs text-stone-warm-500">
                Net Payout: <span className="font-bold text-emerald-700">{formatINR(totalPayoutPaise)}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Orders to Fulfill */}
        <Card className="hover:border-amber-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-warm-600 uppercase tracking-wider">
                Fulfillment Queue
              </span>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-extrabold text-charcoal-900">
                {pendingOrders.length}
              </h3>
              <p className="mt-1 text-xs text-amber-700 font-medium">
                {pendingOrders.filter((o: SellerOrder) => o.status === 'new').length} newly placed orders
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Live Creations */}
        <Card className="hover:border-sky-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-warm-600 uppercase tracking-wider">
                Active Creations
              </span>
              <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-extrabold text-charcoal-900">
                {activeProducts.length}
              </h3>
              <p className="mt-1 text-xs text-stone-warm-500">
                {products.length} total products in catalog
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Platform Tier */}
        <Card className="hover:border-purple-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-warm-600 uppercase tracking-wider">
                Commission Tier
              </span>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-extrabold text-charcoal-900">
                {seller?.commissionRate ? `${seller.commissionRate}%` : '10% (Default)'}
              </h3>
              <p className="mt-1 text-xs text-stone-warm-500">
                {seller?.gstin ? 'GST Registered Studio' : 'Non-GST Bill of Supply'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockProducts.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold">
                Low Inventory Alert: {lowStockProducts.length} creation(s) running out of stock
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Patrons cannot purchase items that reach zero stock.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockProducts.slice(0, 2).map((p) => (
              <button
                key={p._id}
                onClick={() => replenishStockMutation.mutate({ productId: p._id, newStock: p.stock + 10 })}
                className="px-3 py-1 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-xs"
              >
                +10 Stock: {p.title.slice(0, 18)}...
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Section: Recent Orders Fulfillment Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Orders to Fulfill */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-charcoal-900">
                Orders Fulfillment Center
              </h3>
              <p className="text-xs text-stone-warm-600">
                Process placed orders through the crafting and delivery pipeline
              </p>
            </div>
            <Link
              to="/orders"
              className="text-xs font-bold text-terracotta-600 hover:text-terracotta-700 flex items-center gap-1"
            >
              <span>View All ({orders.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {ordersLoading ? (
            <div className="p-12 text-center text-stone-warm-500 bg-white rounded-2xl border border-stone-warm-200">
              Loading recent orders...
            </div>
          ) : orders.length === 0 ? (
            <Card className="p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-warm-100 text-stone-warm-500 mx-auto flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-stone-warm-400" />
              </div>
              <h4 className="font-bold text-charcoal-900">No Orders Yet</h4>
              <p className="text-xs text-stone-warm-600 max-w-sm mx-auto">
                When patrons purchase items from your studio, they will appear right here for packaging and dispatch.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order: SellerOrder) => (
                <div
                  key={order._id}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-warm-200/90 shadow-warm-sm hover:border-terracotta-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-charcoal-900">
                        {order.sellerOrderNumber || (order.orderId as any)?.orderNumber || order._id.slice(-8).toUpperCase()}
                      </span>
                      <Badge status={order.status} size="sm" dot />
                      <span className="text-xs text-stone-warm-500">
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>

                    {/* Items thumbnail list */}
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {order.items?.map((item: any, i: number) => (
                          <img
                            key={i}
                            src={item.image || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=100'}
                            alt={item.title}
                            className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-xs"
                          />
                        ))}
                      </div>
                      <div className="text-xs text-charcoal-800">
                        <span className="font-bold">
                          {order.items?.[0]?.title}
                        </span>
                        {order.items?.length > 1 && (
                          <span className="text-stone-warm-500">
                            {' '}+{order.items.length - 1} more item(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Price & Action Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-warm-100">
                    <div className="text-right sm:mr-2">
                      <div className="text-sm font-display font-bold text-charcoal-900">
                        {formatINR(order.sellerPayout)}
                      </div>
                      <div className="text-[11px] text-stone-warm-500">
                        Net Payout
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedOrder(order)}
                      >
                        Details
                      </Button>

                      {order.status === 'new' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => handleQuickAdvance(order)}
                          isLoading={updateStatusMutation.isPending}
                        >
                          Accept
                        </Button>
                      )}

                      {order.status === 'accepted' && (
                        <Button
                          size="sm"
                          variant="warm"
                          onClick={() => handleQuickAdvance(order)}
                          isLoading={updateStatusMutation.isPending}
                        >
                          Prepare
                        </Button>
                      )}

                      {order.status === 'preparing' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleQuickAdvance(order)}
                          isLoading={updateStatusMutation.isPending}
                        >
                          Pack & Ready
                        </Button>
                      )}

                      {order.status === 'ready_for_pickup' && (
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Dispatch</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Tools & Recent Invoices */}
        <div className="space-y-6">
          {/* Quick Studio Actions Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Studio Quick Actions</CardTitle>
              <CardDescription>Frequent artisan workflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-0">
              <button
                onClick={() => setIsAddProductOpen(true)}
                className="w-full p-3 rounded-xl border border-stone-warm-200 hover:border-terracotta-300 hover:bg-terracotta-50/50 text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-terracotta-100 text-terracotta-700 flex items-center justify-center">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-charcoal-900 group-hover:text-terracotta-700">
                      Add New Handcrafted Item
                    </h5>
                    <p className="text-[11px] text-stone-warm-500">
                      List for review & customer discovery
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-stone-warm-400 group-hover:text-terracotta-600" />
              </button>

              <Link
                to="/orders"
                className="w-full p-3 rounded-xl border border-stone-warm-200 hover:border-amber-300 hover:bg-amber-50/50 text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-charcoal-900 group-hover:text-amber-700">
                      Fulfillment Pipeline
                    </h5>
                    <p className="text-[11px] text-stone-warm-500">
                      Track packaging, couriers, and delivery
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-stone-warm-400 group-hover:text-amber-600" />
              </Link>

              <Link
                to="/invoices"
                className="w-full p-3 rounded-xl border border-stone-warm-200 hover:border-sky-300 hover:bg-sky-50/50 text-left transition-colors flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                    <IndianRupee className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-charcoal-900 group-hover:text-sky-700">
                      Invoices & Payouts
                    </h5>
                    <p className="text-[11px] text-stone-warm-500">
                      Download sales tax invoices & credit notes
                    </p>
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-stone-warm-400 group-hover:text-sky-600" />
              </Link>
            </CardContent>
          </Card>

          {/* Recent Invoices Card */}
          <Card>
            <CardHeader className="pb-4 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Recent Invoices</CardTitle>
                <CardDescription>Sales & commission slips</CardDescription>
              </div>
              <Link to="/invoices" className="text-xs font-bold text-terracotta-600 hover:underline">
                All
              </Link>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {invoices.length === 0 ? (
                <p className="text-xs text-stone-warm-500 text-center py-4">
                  No invoices generated yet.
                </p>
              ) : (
                invoices.slice(0, 3).map((inv) => (
                  <div
                    key={inv._id}
                    className="p-3 rounded-xl bg-stone-warm-50 border border-stone-warm-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-charcoal-900">
                        {inv.invoiceNumber}
                      </span>
                      <div className="text-[11px] text-stone-warm-500">
                        {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-charcoal-900">
                        {formatINR(inv.grandTotal)}
                      </div>
                      <a
                        href={`/api/invoices/${inv._id}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-terracotta-600 hover:underline"
                      >
                        Print PDF
                      </a>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Global Add Product Modal */}
      <ProductModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
      />

      {/* Order Detail & Fulfillment Drawer */}
      {selectedOrder && (
        <OrderDetailModal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
        />
      )}
    </div>
  );
};
