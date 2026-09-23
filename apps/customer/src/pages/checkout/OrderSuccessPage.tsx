import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Store, ShieldCheck, FileText } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const OrderSuccessPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 lg:py-24 text-center space-y-8">
      {/* Success Icon */}
      <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-warm-lg animate-in zoom-in-75 duration-300">
        <CheckCircle className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          Payment Confirmed &bull; Order Received
        </span>
        <h1 className="font-display font-black text-3xl sm:text-4xl text-charcoal-900 tracking-tight">
          Thank you for supporting Indian Artisans!
        </h1>
        <p className="text-sm text-stone-warm-600 max-w-md mx-auto">
          Your order has been split and transmitted directly to the respective creator workshops for handcrafted preparation and safe dispatch.
        </p>
      </div>

      {/* Order Info Card */}
      <div className="bg-white rounded-3xl border border-stone-warm-200 p-6 sm:p-8 shadow-warm-sm text-left space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-warm-100">
          <div>
            <span className="text-xs text-stone-warm-500">Order Reference</span>
            <p className="font-display font-black text-lg text-charcoal-900">
              {orderId || 'KP-PLACED'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Payment Received</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-stone-warm-50 border border-stone-warm-200 space-y-1">
            <span className="font-bold text-charcoal-800 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-terracotta-600" />
              Direct Workshop Dispatch
            </span>
            <p className="text-stone-warm-600">
              The creators have received your craft instructions and customisation notes.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-warm-50 border border-stone-warm-200 space-y-1">
            <span className="font-bold text-charcoal-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-terracotta-600" />
              GST Tax Invoices Ready
            </span>
            <p className="text-stone-warm-600">
              Download your official Sales Tax Invoice anytime from your Customer Orders dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to="/orders" className="w-full sm:w-auto">
          <Button size="lg" variant="primary" className="w-full shadow-warm-md" rightIcon={<ArrowRight className="w-4 h-4" />}>
            View Orders & Download Invoices
          </Button>
        </Link>
        <Link to="/catalog" className="w-full sm:w-auto">
          <Button size="lg" variant="secondary" className="w-full">
            Continue Exploring Crafts
          </Button>
        </Link>
      </div>
    </div>
  );
};
