import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingBag,
  Search,
  Eye,
  Store,
  Truck,
  CreditCard,
  MapPin,
  Clock,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card, CardBody } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';

interface SellerOrderSub {
  _id: string;
  sellerId: {
    _id: string;
    shopName: string;
    slug: string;
    location?: string;
    gstin?: string;
  };
  status:
    | 'new'
    | 'accepted'
    | 'preparing'
    | 'ready_for_pickup'
    | 'shipped'
    | 'delivered'
    | 'cancelled';
  subtotal: number;
  commissionRate: number;
  commissionAmount: number;
  payoutAmount: number;
  courierName?: string;
  trackingRef?: string;
  items: Array<{
    productId: string;
    title: string;
    image: string;
    qty: number;
    unitPrice: number;
    customisationNote?: string;
  }>;
}

interface OrderItem {
  _id: string;
  orderNumber: string;
  customerId?: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  shippingAddress: {
    name: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  sellerOrders?: SellerOrderSub[];
}

export const OrdersOversightPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  const { data, isLoading } = useQuery<{ orders: OrderItem[] }>({
    queryKey: ['admin-orders', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      const res = await api.get<{ orders: OrderItem[] }>(`/orders/admin/list?${params.toString()}`);
      return res || { orders: [] };
    },
  });

  const orders = data?.orders || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="emerald">Delivered</Badge>;
      case 'shipped':
        return <Badge variant="blue">Shipped</Badge>;
      case 'ready_for_pickup':
        return <Badge variant="amber">Ready for Pickup</Badge>;
      case 'preparing':
        return <Badge variant="terracotta">Crafting</Badge>;
      case 'accepted':
        return <Badge variant="slate">Accepted</Badge>;
      case 'cancelled':
        return <Badge variant="rose">Cancelled</Badge>;
      case 'new':
      default:
        return <Badge variant="slate">New</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Platform Orders & Multi-Vendor Oversight
          </h1>
          <p className="text-xs text-admin-400 mt-1">
            Audit master customer orders, fulfillment pipelines, and real-time commission disbursements.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <input
            type="text"
            placeholder="Search order # or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-admin-900 border border-admin-700 rounded-xl text-xs text-white placeholder:text-admin-500 focus:outline-none focus:border-terracotta-500"
          />
          <Search className="w-4 h-4 text-admin-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Orders Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-admin-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 p-8 space-y-2">
              <ShoppingBag className="w-10 h-10 text-admin-600 mx-auto" />
              <h3 className="font-bold text-sm text-admin-300">No Orders Found</h3>
              <p className="text-xs text-admin-500">Orders placed on the marketplace will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-950/60 border-b border-admin-800 text-admin-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Order #</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Destination</th>
                    <th className="px-6 py-4">Fulfillment Splits</th>
                    <th className="px-6 py-4">Payment</th>
                    <th className="px-6 py-4">Grand Total</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-800 text-admin-200">
                  {orders.map((o) => (
                    <tr key={o._id} className="hover:bg-admin-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white font-mono">{o.orderNumber}</td>
                      <td className="px-6 py-4 text-admin-400">
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{o.customerId?.name || o.shippingAddress?.name || 'Customer'}</div>
                        <div className="text-admin-400 text-[11px]">{o.customerId?.email}</div>
                      </td>
                      <td className="px-6 py-4 text-admin-300">
                        {o.shippingAddress?.city}, {o.shippingAddress?.state}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="terracotta" size="sm">
                          {o.sellerOrders?.length || 1} Creator {o.sellerOrders?.length === 1 ? 'Studio' : 'Studios'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="emerald" size="sm">
                          {o.paymentStatus?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-bold text-white text-sm">
                        {formatINR(o.totalAmount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedOrder(o)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* DETAILED MULTI-VENDOR ORDER INSPECTION MODAL */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Master Order #${selectedOrder.orderNumber}` : ''}
        maxWidth="3xl"
      >
        {selectedOrder && (
          <div className="space-y-6 text-xs text-admin-200">
            {/* Top Summary Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-1">
                <span className="text-admin-500 text-[11px] uppercase font-bold">Customer</span>
                <p className="font-bold text-white text-sm">{selectedOrder.customerId?.name || selectedOrder.shippingAddress?.name}</p>
                <p className="text-admin-400">{selectedOrder.customerId?.email} &bull; {selectedOrder.shippingAddress?.phone}</p>
              </div>

              <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-1">
                <span className="text-admin-500 text-[11px] uppercase font-bold">Shipping Destination</span>
                <p className="text-admin-100">
                  {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.city},{' '}
                  {selectedOrder.shippingAddress?.state} - {selectedOrder.shippingAddress?.pincode}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-1">
                <span className="text-admin-500 text-[11px] uppercase font-bold">Payment & Settlement</span>
                <p className="text-emerald-400 font-bold text-sm">
                  {formatINR(selectedOrder.totalAmount)} (PAID)
                </p>
                <p className="text-admin-400">Escrow Cleared &bull; Invoices Issued</p>
              </div>
            </div>

            {/* Split Seller Orders */}
            <div className="space-y-4">
              <h3 className="font-display font-bold text-sm text-white">
                Multi-Vendor Fulfillment Splits ({selectedOrder.sellerOrders?.length || 0})
              </h3>

              <div className="space-y-4">
                {selectedOrder.sellerOrders?.map((subOrder) => (
                  <div
                    key={subOrder._id}
                    className="p-5 rounded-2xl bg-admin-950 border border-admin-800 space-y-4"
                  >
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-admin-800">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4 text-terracotta-400" />
                        <span className="font-bold text-white text-sm">
                          {subOrder.sellerId?.shopName || 'Artisan Studio'}
                        </span>
                        {subOrder.sellerId?.location && (
                          <span className="text-admin-400 text-xs">&bull; {subOrder.sellerId.location}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(subOrder.status)}
                      </div>
                    </div>

                    {/* Financial Split Breakdown */}
                    <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-admin-900 border border-admin-800 text-[11px]">
                      <div>
                        <span className="text-admin-500 block">Subtotal</span>
                        <span className="font-bold text-white">{formatINR(subOrder.subtotal)}</span>
                      </div>
                      <div>
                        <span className="text-admin-500 block">
                          Commission ({subOrder.commissionRate || 10}%)
                        </span>
                        <span className="font-bold text-emerald-400">
                          {formatINR(subOrder.commissionAmount || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-admin-500 block">Artisan Net Payout</span>
                        <span className="font-bold text-blue-400">
                          {formatINR(subOrder.payoutAmount || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Courier Tracking */}
                    {subOrder.trackingRef && (
                      <div className="p-3 rounded-xl bg-admin-900 border border-admin-800 flex items-center gap-2 text-xs text-admin-300">
                        <Truck className="w-4 h-4 text-terracotta-400 shrink-0" />
                        <span>
                          Courier: <strong>{subOrder.courierName || 'Delhivery / SpeedPost'}</strong> &bull; Waybill:{' '}
                          <strong>{subOrder.trackingRef}</strong>
                        </span>
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-2">
                      {subOrder.items?.map((item, idx) => (
                        <div key={idx} className="flex gap-3 items-center text-xs">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-12 h-12 rounded-xl object-cover border border-admin-800 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{item.title}</p>
                            <p className="text-admin-400 text-[11px]">
                              Qty: {item.qty} &times; {formatINR(item.unitPrice)}
                            </p>
                            {item.customisationNote && (
                              <p className="text-[10px] text-terracotta-300 italic">
                                Note: &ldquo;{item.customisationNote}&rdquo;
                              </p>
                            )}
                          </div>
                          <span className="font-bold text-white">
                            {formatINR(item.unitPrice * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
