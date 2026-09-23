import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import { formatINR, cn } from '../../lib/utils';
import {
  ShoppingBag,
  MapPin,
  Clock,
  Truck,
  CheckCircle2,
  FileText,
  AlertCircle,
  ExternalLink,
  Printer,
} from 'lucide-react';

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  isOpen,
  onClose,
  order,
}) => {
  const [courierName, setCourierName] = useState(order?.courierInfo?.courier || order?.courierName || 'Blue Dart');
  const [trackingNumber, setTrackingNumber] = useState(order?.courierInfo?.trackingNumber || order?.trackingRef || '');
  const [statusNote, setStatusNote] = useState('');

  const queryClient = useQueryClient();
  const toast = useToast();

  const updateStatusMutation = useMutation({
    mutationFn: async ({ nextStatus, courier }: { nextStatus: string; courier?: any }) => {
      return api.patch(`/orders/seller/item/${order._id}/status`, {
        status: nextStatus,
        statusNote: statusNote || undefined,
        ...courier,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
      queryClient.invalidateQueries({ queryKey: ['seller-orders-pending-count'] });
      toast.success('Status Advanced', 'Order fulfillment status has been updated.');
      onClose();
    },
    onError: (err: any) => {
      toast.error('Update Failed', err.message || 'Could not advance status.');
    },
  });

  if (!order) return null;

  const handleAdvance = (nextStatus: string) => {
    if (nextStatus === 'shipped') {
      if (!trackingNumber.trim()) {
        toast.error('Tracking ID Required', 'Please enter the courier tracking number to mark as shipped.');
        return;
      }
      updateStatusMutation.mutate({
        nextStatus: 'shipped',
        courier: {
          courierName: courierName,
          trackingRef: trackingNumber.trim(),
          courierInfo: {
            courier: courierName,
            trackingNumber: trackingNumber.trim(),
            shippedAt: new Date().toISOString(),
          },
        },
      });
    } else {
      updateStatusMutation.mutate({ nextStatus });
    }
  };

  const statusTimeline = [
    { key: 'new', label: 'Order Placed' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'preparing', label: 'Handcrafting' },
    { key: 'ready_for_pickup', label: 'Packaged' },
    { key: 'shipped', label: 'In Transit' },
    { key: 'delivered', label: 'Delivered' },
  ];

  const currentStatusIndex = statusTimeline.findIndex((s) => s.key === order.status);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="font-mono">
            {order.sellerOrderNumber || order._id.slice(-8).toUpperCase()}
          </span>
          <Badge status={order.status} size="sm" dot />
        </div>
      }
      description={`Placed on ${new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`}
      maxWidth="3xl"
    >
      <div className="space-y-6">
        {/* Visual Fulfillment Step Tracker */}
        <div className="p-4 bg-stone-warm-50 rounded-2xl border border-stone-warm-200">
          <div className="flex items-center justify-between overflow-x-auto pb-1">
            {statusTimeline.map((step, idx) => {
              const isCompleted = currentStatusIndex >= idx;
              const isCurrent = order.status === step.key;

              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center text-center min-w-[75px] space-y-1"
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                      isCurrent
                        ? 'bg-terracotta-500 text-white ring-4 ring-terracotta-100'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-stone-warm-200 text-stone-warm-500'
                    )}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={cn(
                      'text-[11px] font-semibold',
                      isCurrent
                        ? 'text-terracotta-700 font-bold'
                        : isCompleted
                        ? 'text-charcoal-900'
                        : 'text-stone-warm-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 1: Customer & Delivery Address */}
        {(() => {
          const address = order.shippingAddressSnapshot || (order.orderId as any)?.shippingAddress;
          const activeCourier = order.courierInfo?.courier || order.courierName;
          const activeTracking = order.courierInfo?.trackingNumber || order.trackingRef;

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white border border-stone-warm-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-warm-600">
                  <MapPin className="w-4 h-4 text-terracotta-500" />
                  <span>Patron & Shipping Destination</span>
                </div>
                {address ? (
                  <div className="text-xs text-charcoal-800 space-y-0.5">
                    <p className="font-bold text-sm text-charcoal-900">
                      {address.name || 'Valued Patron'}
                    </p>
                    <p>{address.street}</p>
                    {address.landmark && (
                      <p className="text-stone-warm-500">
                        Near {address.landmark}
                      </p>
                    )}
                    <p>
                      {address.city ? `${address.city}, ` : ''}
                      {address.state ? `${address.state} — ` : ''}
                      <span className="font-mono font-bold">
                        {address.pincode}
                      </span>
                    </p>
                    {address.phone && (
                      <p className="pt-1 text-stone-warm-600">
                        Phone: {address.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-stone-warm-500">
                    Delivery address snapshot not attached.
                  </p>
                )}
              </div>

              {/* Courier & Tracking Details */}
              <div className="p-4 rounded-2xl bg-white border border-stone-warm-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-warm-600">
                  <Truck className="w-4 h-4 text-terracotta-500" />
                  <span>Courier & Logistics</span>
                </div>
                {activeTracking ? (
                  <div className="text-xs text-charcoal-800 space-y-1">
                    <p className="text-stone-warm-500">Partner Courier:</p>
                    <p className="font-bold text-sm text-charcoal-900">
                      {activeCourier || 'Blue Dart Express'}
                    </p>
                    <p className="text-stone-warm-500 pt-1">Waybill / Tracking No:</p>
                    <p className="font-mono font-bold text-sm text-terracotta-700 bg-terracotta-50 px-2 py-1 rounded-md inline-block">
                      {activeTracking}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-stone-warm-500">
                    Not yet dispatched. Enter courier details below when ready to ship.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* Section 2: Items in this Seller Order */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
            Handcrafted Items to Fulfill ({order.items?.length || 0})
          </h4>
          <div className="divide-y divide-stone-warm-200 border border-stone-warm-200 rounded-2xl overflow-hidden bg-white">
            {order.items?.map((item: any, i: number) => (
              <div key={i} className="p-4 flex items-start gap-4">
                <img
                  src={item.image || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=120'}
                  alt={item.title}
                  className="w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-warm-200"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="text-sm font-bold text-charcoal-900">
                        {item.title}
                      </h5>
                      <p className="text-xs text-stone-warm-500 font-mono">
                        HSN: {item.hsnCode || '6913'} • GST: {item.gstRate || 0}%
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-charcoal-900">
                        {formatINR(item.lineTotal || item.unitPrice * item.qty)}
                      </div>
                      <div className="text-xs text-stone-warm-500">
                        {item.qty} × {formatINR(item.unitPrice)}
                      </div>
                    </div>
                  </div>

                  {/* Customisation Note highlighted */}
                  {item.customisationNote && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Patron Customisation Request:</span>
                        <p className="mt-0.5 font-mono bg-white/70 px-2 py-1 rounded border border-amber-200/50">
                          "{item.customisationNote}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Financial Settlement Summary */}
        <div className="p-4 bg-stone-warm-50 rounded-2xl border border-stone-warm-200 space-y-2 text-xs">
          <div className="flex justify-between text-stone-warm-600">
            <span>Items Subtotal</span>
            <span className="font-semibold text-charcoal-900">{formatINR(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-stone-warm-600">
            <span>Kumor Para Commission ({order.commissionRateSnapshot || 10}%)</span>
            <span className="font-semibold text-rose-700">-{formatINR(order.commissionAmount)}</span>
          </div>
          <div className="pt-2 border-t border-stone-warm-200 flex justify-between text-sm font-bold text-charcoal-900">
            <span>Your Net Payout</span>
            <span className="text-base text-emerald-700 font-display font-extrabold">
              {formatINR(order.sellerPayout)}
            </span>
          </div>
        </div>

        {/* Section 4: Advance Fulfillment Controls */}
        <div className="p-5 rounded-2xl bg-white border border-stone-warm-300/80 space-y-4 shadow-warm-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-800">
            Advance Order Stage
          </h4>

          {order.status === 'ready_for_pickup' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-stone-warm-50 rounded-xl border border-stone-warm-200">
              <Select
                label="Courier Service *"
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                options={[
                  { label: 'Blue Dart Express', value: 'Blue Dart' },
                  { label: 'Delhivery Logistics', value: 'Delhivery' },
                  { label: 'DTDC Courier', value: 'DTDC' },
                  { label: 'India Post Speed Post', value: 'India Post' },
                  { label: 'Shadowfax Local', value: 'Shadowfax' },
                ]}
              />
              <Input
                label="Waybill / Tracking Number *"
                placeholder="e.g. BD987654321IN"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                required
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Download invoice button if invoice exists */}
            {order.invoiceId ? (
              <a
                href={`/api/invoices/${typeof order.invoiceId === 'object' ? order.invoiceId._id : order.invoiceId}/pdf`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-terracotta-700 bg-terracotta-50 hover:bg-terracotta-100 rounded-xl transition-colors border border-terracotta-200"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Sales Invoice</span>
              </a>
            ) : (
              <span className="text-xs text-stone-warm-500">
                Invoice generated upon order placement
              </span>
            )}

            <div className="flex items-center gap-2">
              {order.status === 'new' && (
                <Button
                  onClick={() => handleAdvance('accepted')}
                  isLoading={updateStatusMutation.isPending}
                >
                  Accept Order
                </Button>
              )}

              {order.status === 'accepted' && (
                <Button
                  variant="warm"
                  onClick={() => handleAdvance('preparing')}
                  isLoading={updateStatusMutation.isPending}
                >
                  Start Crafting
                </Button>
              )}

              {order.status === 'preparing' && (
                <Button
                  variant="secondary"
                  onClick={() => handleAdvance('ready_for_pickup')}
                  isLoading={updateStatusMutation.isPending}
                >
                  Package & Ready for Pickup
                </Button>
              )}

              {order.status === 'ready_for_pickup' && (
                <Button
                  variant="primary"
                  onClick={() => handleAdvance('shipped')}
                  isLoading={updateStatusMutation.isPending}
                >
                  <Truck className="w-4 h-4" />
                  <span>Dispatch & Ship</span>
                </Button>
              )}

              {order.status === 'shipped' && (
                <Button
                  variant="primary"
                  onClick={() => handleAdvance('delivered')}
                  isLoading={updateStatusMutation.isPending}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Delivered</span>
                </Button>
              )}

              {order.status === 'delivered' && (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold">
                  Order Completed & Delivered
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
