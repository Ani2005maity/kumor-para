import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { OrderDetailModal } from './OrderDetailModal';
import { useToast } from '../../components/common/Toast';
import { formatINR, cn } from '../../lib/utils';
import {
  ShoppingBag,
  Search,
  Filter,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  PackageCheck,
  AlertCircle,
  Calendar,
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
  shippingAddressSnapshot?: any;
  [key: string]: any;
}

export const OrdersPipelinePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch Seller's Orders
  const { data, isLoading } = useQuery<{ orders: SellerOrder[]; total: number }>({
    queryKey: ['seller-orders'],
    queryFn: () => api.get<{ orders: SellerOrder[]; total: number }>('/orders/seller/list'),
  });

  const orders: SellerOrder[] = data?.orders || (data as any)?.sellerOrders || [];

  // Filter orders
  const filteredOrders = orders.filter((order: SellerOrder) => {
    if (activeTab !== 'all' && order.status !== activeTab) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber =
        order.sellerOrderNumber?.toLowerCase().includes(q) ||
        (order.orderId as any)?.orderNumber?.toLowerCase().includes(q) ||
        order._id.toLowerCase().includes(q);
      const address = order.shippingAddressSnapshot || (order.orderId as any)?.shippingAddress;
      const matchCustomer = address?.name?.toLowerCase().includes(q);
      const matchCity = address?.city?.toLowerCase().includes(q);
      const matchItem = order.items?.some((i: any) => i.title?.toLowerCase().includes(q));
      return matchNumber || matchCustomer || matchCity || matchItem;
    }
    return true;
  });

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
      toast.success('Order Advanced', 'The order status was updated successfully.');
    },
    onError: (err: any) => {
      toast.error('Update Failed', err.message);
    },
  });

  const handleQuickAdvance = (order: SellerOrder) => {
    if (order.status === 'new') {
      updateStatusMutation.mutate({ orderId: order._id, nextStatus: 'accepted' });
    } else if (order.status === 'accepted') {
      updateStatusMutation.mutate({ orderId: order._id, nextStatus: 'preparing' });
    } else if (order.status === 'preparing') {
      updateStatusMutation.mutate({ orderId: order._id, nextStatus: 'ready_for_pickup' });
    } else if (order.status === 'ready_for_pickup') {
      setSelectedOrder(order); // requires courier tracking ID
    } else if (order.status === 'shipped') {
      updateStatusMutation.mutate({ orderId: order._id, nextStatus: 'delivered' });
    }
  };

  const tabs = [
    { key: 'all', label: 'All Orders', count: orders.length },
    {
      key: 'new',
      label: 'New Orders',
      count: orders.filter((o: SellerOrder) => o.status === 'new').length,
    },
    {
      key: 'accepted',
      label: 'Accepted',
      count: orders.filter((o: SellerOrder) => o.status === 'accepted').length,
    },
    {
      key: 'preparing',
      label: 'Handcrafting',
      count: orders.filter((o: SellerOrder) => o.status === 'preparing').length,
    },
    {
      key: 'ready_for_pickup',
      label: 'Ready for Pickup',
      count: orders.filter((o: SellerOrder) => o.status === 'ready_for_pickup').length,
    },
    {
      key: 'shipped',
      label: 'In Transit',
      count: orders.filter((o: SellerOrder) => o.status === 'shipped').length,
    },
    {
      key: 'delivered',
      label: 'Delivered',
      count: orders.filter((o: SellerOrder) => o.status === 'delivered').length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-display font-extrabold text-charcoal-900">
          Order Fulfillment Pipeline
        </h2>
        <p className="text-xs sm:text-sm text-stone-warm-600">
          Track incoming patron orders from workshop bench to doorstep delivery
        </p>
      </div>

      {/* Pipeline Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2',
              activeTab === tab.key
                ? 'bg-charcoal-900 text-white shadow-warm-sm'
                : 'bg-white text-charcoal-700 hover:bg-stone-warm-200/80 border border-stone-warm-200'
            )}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                  activeTab === tab.key
                    ? 'bg-charcoal-700 text-white'
                    : 'bg-stone-warm-200 text-stone-warm-800'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-2xl border border-stone-warm-200/90 shadow-warm-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-stone-warm-400 pl-1" />
        <input
          type="text"
          placeholder="Search by order #, patron name, destination city, or item title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-charcoal-900 placeholder:text-stone-warm-400 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-stone-warm-500 hover:text-charcoal-800 font-semibold px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Orders List */}
      {isLoading ? (
        <div className="p-16 text-center text-stone-warm-500 bg-white rounded-3xl border border-stone-warm-200">
          Loading fulfillment pipeline...
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-stone-warm-100 text-stone-warm-500 mx-auto flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-stone-warm-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-charcoal-900">No orders in this stage</h3>
            <p className="text-xs sm:text-sm text-stone-warm-600 mt-1 max-w-sm mx-auto">
              {searchQuery || activeTab !== 'all'
                ? 'Try selecting a different filter tab or clearing search queries.'
                : 'When patrons place orders containing your handmade creations, they will appear here.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order: SellerOrder) => {
            const hasCustomisation = order.items?.some((i: any) => Boolean(i.customisationNote));

            return (
              <div
                key={order._id}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-stone-warm-200/90 shadow-warm-sm hover:shadow-warm-md hover:border-terracotta-300 transition-all space-y-4"
              >
                {/* Header row: Order ID, Date, Badge, Patron */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-warm-100">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-bold text-charcoal-900">
                      {order.sellerOrderNumber || order._id.slice(-8).toUpperCase()}
                    </span>
                    <Badge status={order.status} size="sm" dot />
                    {hasCustomisation && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[11px] font-bold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>Customisation Included</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-warm-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Middle row: Items & Customer Address */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Items list */}
                  <div className="lg:col-span-2 space-y-3">
                    {order.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-3">
                        <img
                          src={item.image || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=100'}
                          alt={item.title}
                          className="w-12 h-12 rounded-xl object-cover border border-stone-warm-200 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-charcoal-900 truncate">
                            {item.title}
                          </h4>
                          <div className="text-xs text-stone-warm-500 flex items-center gap-2">
                            <span>Qty: {item.qty}</span>
                            <span>•</span>
                            <span>{formatINR(item.unitPrice)} each</span>
                          </div>
                          {item.customisationNote && (
                            <p className="mt-1 text-xs text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60 inline-block font-mono">
                              "{item.customisationNote}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Patron Destination */}
                  {(() => {
                    const address = order.shippingAddressSnapshot || (order.orderId as any)?.shippingAddress;
                    const courierName = order.courierInfo?.courier || order.courierName;
                    const trackingNo = order.courierInfo?.trackingNumber || order.trackingRef;

                    return (
                      <div className="p-3 bg-stone-warm-50/70 rounded-2xl border border-stone-warm-200/80 text-xs text-charcoal-800 space-y-1">
                        <div className="font-bold text-charcoal-900">
                          Patron: {address?.name || 'Customer'}
                        </div>
                        <p className="text-stone-warm-600">
                          {address?.city ? `${address.city}, ` : ''}{address?.state || ''}
                        </p>
                        {trackingNo ? (
                          <div className="pt-2 text-xs">
                            <span className="text-stone-warm-500">Shipped via </span>
                            <span className="font-bold">{courierName || 'Partner Courier'}: </span>
                            <span className="font-mono text-terracotta-700 font-bold">
                              {trackingNo}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>

                {/* Footer row: Payout & Actions */}
                <div className="pt-3 border-t border-stone-warm-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="text-xs text-stone-warm-500">Subtotal</div>
                      <div className="text-sm font-semibold text-charcoal-800">
                        {formatINR(order.subtotal)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-stone-warm-500">Commission</div>
                      <div className="text-sm font-semibold text-rose-700">
                        -{formatINR(order.commissionAmount)}
                      </div>
                    </div>
                    <div className="pl-3 border-l border-stone-warm-200">
                      <div className="text-xs text-stone-warm-500">Your Net Payout</div>
                      <div className="text-base font-display font-extrabold text-emerald-700">
                        {formatINR(order.sellerPayout)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedOrder(order)}
                    >
                      View Details & Invoice
                    </Button>

                    {order.status === 'new' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleQuickAdvance(order)}
                        isLoading={updateStatusMutation.isPending}
                      >
                        Accept Order
                      </Button>
                    )}

                    {order.status === 'accepted' && (
                      <Button
                        size="sm"
                        variant="warm"
                        onClick={() => handleQuickAdvance(order)}
                        isLoading={updateStatusMutation.isPending}
                      >
                        Start Crafting
                      </Button>
                    )}

                    {order.status === 'preparing' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleQuickAdvance(order)}
                        isLoading={updateStatusMutation.isPending}
                      >
                        Package Ready
                      </Button>
                    )}

                    {order.status === 'ready_for_pickup' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Ship Order</span>
                      </Button>
                    )}

                    {order.status === 'shipped' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleQuickAdvance(order)}
                        isLoading={updateStatusMutation.isPending}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Delivered</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail & Action Modal */}
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
