import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Package,
  FileText,
  Truck,
  Download,
  Eye,
  ExternalLink,
  Store,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';

interface SellerOrderSub {
  _id: string;
  sellerId: {
    _id: string;
    shopName: string;
    slug: string;
    location?: string;
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
  grandTotal?: number;
  totalAmount?: number;
  itemsSubtotal?: number;
  deliveryFee?: number;
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
  sellerOrders: SellerOrderSub[];
}

interface InvoiceItem {
  _id: string;
  invoiceNumber: string;
  type: string;
  grandTotal: number;
  issuedAt: string;
  orderId?: string;
  sellerOrderId?: string;
}

export const OrdersHistoryPage: React.FC = () => {
  const { user, loading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'invoices'>('orders');
  const [selectedInvoiceHtml, setSelectedInvoiceHtml] = useState<string | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  // Fetch Orders
  const { data: ordersData, isLoading: isOrdersLoading } = useQuery<{ orders: OrderItem[] }>({
    queryKey: ['customer-orders'],
    queryFn: async () => {
      const res = await api.get<{ orders: OrderItem[] }>('/orders/my-orders');
      return res || { orders: [] };
    },
    enabled: !!user,
  });

  // Fetch Customer Invoices
  const { data: invoicesData, isLoading: isInvoicesLoading } = useQuery<{
    invoices: InvoiceItem[];
  }>({
    queryKey: ['customer-invoices'],
    queryFn: async () => {
      const res = await api.get<{ invoices: InvoiceItem[] }>('/invoices/customer/my-invoices');
      return res || { invoices: [] };
    },
    enabled: !!user,
  });

  if (isAuthLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="h-8 w-48 bg-stone-warm-200 rounded-lg mx-auto animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login?redirect=/orders" replace />;
  }

  const orders = ordersData?.orders || [];
  const invoices = invoicesData?.invoices || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge variant="emerald">Delivered</Badge>;
      case 'shipped':
        return <Badge variant="blue">Shipped &bull; In Transit</Badge>;
      case 'ready_for_pickup':
        return <Badge variant="ochre">Packed &bull; Ready</Badge>;
      case 'preparing':
        return <Badge variant="terracotta">Crafting in Studio</Badge>;
      case 'accepted':
        return <Badge variant="stone">Order Accepted</Badge>;
      case 'cancelled':
        return <Badge variant="rose">Cancelled</Badge>;
      case 'new':
      default:
        return <Badge variant="stone">Received</Badge>;
    }
  };

  const handleViewInvoice = async (invoiceId: string) => {
    setIsLoadingInvoice(true);
    try {
      const html = await api.get<string>(`/invoices/${invoiceId}/pdf`);
      setSelectedInvoiceHtml(html);
    } catch (err) {
      alert('Could not render invoice document. Please try again.');
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display font-black text-3xl sm:text-4xl text-charcoal-900 tracking-tight">
          My Craft Orders & Invoices
        </h1>
        <p className="text-xs sm:text-sm text-stone-warm-600 mt-1">
          Track fulfillment status across independent Indian studios and access statutory GST tax invoices.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-4 border-b border-stone-warm-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-2 text-sm font-display font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'orders'
              ? 'border-terracotta-600 text-terracotta-700'
              : 'border-transparent text-stone-warm-600 hover:text-charcoal-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Orders ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 px-2 text-sm font-display font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'invoices'
              ? 'border-terracotta-600 text-terracotta-700'
              : 'border-transparent text-stone-warm-600 hover:text-charcoal-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Tax Invoices ({invoices.length})</span>
        </button>
      </div>

      {/* TAB 1: ORDERS LIST */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {isOrdersLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 bg-stone-warm-200 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-stone-warm-200 p-8 space-y-4 shadow-warm-sm">
              <div className="w-16 h-16 rounded-3xl bg-terracotta-50 border border-terracotta-200 flex items-center justify-center text-terracotta-600 mx-auto">
                <Package className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-charcoal-900">No orders placed yet</h3>
                <p className="text-xs text-stone-warm-600 max-w-sm mx-auto">
                  Support master creators by exploring authentic handmade pottery, leather, and jewelry.
                </p>
              </div>
              <Link to="/catalog">
                <Button size="md">Explore Marketplace</Button>
              </Link>
            </div>
          ) : (
            orders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-3xl border border-stone-warm-200 overflow-hidden shadow-warm-sm space-y-6 p-6 sm:p-8"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-warm-100 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-black text-base text-charcoal-900">
                        Order #{order.orderNumber}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {order.paymentStatus.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-stone-warm-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-stone-warm-500 block">Total Amount</span>
                    <span className="font-display font-black text-lg text-terracotta-700">
                      {formatINR(order.grandTotal ?? order.totalAmount ?? 0)}
                    </span>
                  </div>
                </div>

                {/* Sub-Orders Grouped by Artisan Studio */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-warm-500">
                    Artisan Studio Fulfillment ({order.sellerOrders?.length || 0})
                  </h4>

                  <div className="grid grid-cols-1 gap-4">
                    {order.sellerOrders?.map((subOrder) => (
                      <div
                        key={subOrder._id}
                        className="bg-stone-warm-50 rounded-2xl border border-stone-warm-200/80 p-5 space-y-4"
                      >
                        {/* Workshop Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-warm-200">
                          <div className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-terracotta-600" />
                            <span className="font-bold text-sm text-charcoal-900">
                              {subOrder.sellerId?.shopName || 'Artisan Workshop'}
                            </span>
                            {subOrder.sellerId?.location && (
                              <span className="text-xs text-stone-warm-500">
                                &bull; {subOrder.sellerId.location}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {getStatusBadge(subOrder.status)}
                          </div>
                        </div>

                        {/* Courier & Tracking Info */}
                        {subOrder.trackingRef && (
                          <div className="p-3 rounded-xl bg-white border border-stone-warm-200 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-stone-warm-700">
                              <Truck className="w-4 h-4 text-terracotta-600" />
                              <span>
                                Courier: <strong>{subOrder.courierName || 'Delhivery / SpeedPost'}</strong> &bull; Tracking ID: <strong>{subOrder.trackingRef}</strong>
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Items in this sub-order */}
                        <div className="space-y-3">
                          {subOrder.items?.map((item, idx) => (
                            <div key={idx} className="flex gap-4 items-center text-xs">
                              <img
                                src={item.image}
                                alt={item.title}
                                className="w-14 h-14 rounded-xl object-cover border border-stone-warm-200 shrink-0 bg-white"
                              />
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-charcoal-900 text-sm line-clamp-1">
                                  {item.title}
                                </h5>
                                <p className="text-stone-warm-600">
                                  Qty: {item.qty} &times; {formatINR(item.unitPrice)}
                                </p>
                                {item.customisationNote && (
                                  <p className="text-[11px] text-terracotta-800 italic mt-0.5">
                                    Custom note: &ldquo;{item.customisationNote}&rdquo;
                                  </p>
                                )}
                              </div>
                              <span className="font-bold text-charcoal-900 text-sm">
                                {formatINR(item.unitPrice * item.qty)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Address Summary */}
                <div className="pt-2 text-xs text-stone-warm-600 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-t border-stone-warm-100">
                  <div>
                    <span className="font-semibold text-charcoal-700">Delivering to: </span>
                    {order.shippingAddress?.name}, {order.shippingAddress?.street},{' '}
                    {order.shippingAddress?.city}, {order.shippingAddress?.state} -{' '}
                    {order.shippingAddress?.pincode}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: INVOICES LIST */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-3xl border border-stone-warm-200 overflow-hidden shadow-warm-sm">
          {isInvoicesLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-stone-warm-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-20 p-8 space-y-3">
              <FileText className="w-12 h-12 text-stone-warm-400 mx-auto" />
              <h3 className="font-display font-bold text-base text-charcoal-900">No Invoices Found</h3>
              <p className="text-xs text-stone-warm-600">Tax invoices are generated automatically after placing orders.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-warm-100/70 border-b border-stone-warm-200 text-stone-warm-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Invoice #</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Issue Date</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-warm-100 text-charcoal-800">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-stone-warm-50/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-charcoal-900">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4">
                        <Badge variant="stone" size="sm">{inv.type.toUpperCase()}</Badge>
                      </td>
                      <td className="px-6 py-4 text-stone-warm-600">
                        {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 font-bold text-charcoal-900">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewInvoice(inv._id)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View / Print PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoice Document Modal Viewer */}
      <Modal
        isOpen={!!selectedInvoiceHtml}
        onClose={() => setSelectedInvoiceHtml(null)}
        title="Official GST Tax Invoice"
        maxWidth="2xl"
      >
        {selectedInvoiceHtml && (
          <div className="space-y-4">
            <div
              className="bg-white p-4 rounded-xl border border-stone-warm-200 max-h-[60vh] overflow-y-auto text-xs"
              dangerouslySetInnerHTML={{ __html: selectedInvoiceHtml }}
            />
            <div className="flex justify-end gap-3 pt-2 border-t border-stone-warm-100">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedInvoiceHtml(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(selectedInvoiceHtml);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
