import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCartStore } from '../../store/useCartStore';
import { api } from '../../lib/api';
import { formatINR, INDIAN_STATES } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import {
  ShieldCheck,
  Lock,
  Store,
  Truck,
  ArrowRight,
  AlertCircle,
  Sparkles,
  User,
  ShoppingBag,
} from 'lucide-react';

interface CheckoutResponse {
  order: {
    _id: string;
    orderNumber: string;
    totalAmount: number;
    subOrders?: Array<{
      sellerId: string;
      status: string;
    }>;
  };
}

export const CheckoutPage: React.FC = () => {
  const { user } = useAuth();
  const { items, getSellerGroups, getSubtotalPaise, clearCart } = useCartStore();
  const navigate = useNavigate();

  const sellerGroups = getSellerGroups();
  const subtotalPaise = getSubtotalPaise();
  const shippingPaise = subtotalPaise > 99900 ? 0 : 9900; // Free shipping over ₹999
  const totalPayablePaise = subtotalPaise + shippingPaise;

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    street: '',
    landmark: '',
    city: '',
    state: 'West Bengal',
    stateCode: '19',
    pincode: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Prefill default address if available
  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0) {
      const def = user.addresses.find((a) => a.isDefault) || user.addresses[0];
      setFormData({
        name: def.name || user.name || '',
        phone: def.phone || user.phone || '',
        street: def.street || '',
        landmark: def.landmark || '',
        city: def.city || '',
        state: def.state || 'West Bengal',
        stateCode: def.stateCode || '19',
        pincode: def.pincode || '',
      });
    } else if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-terracotta-50 border border-terracotta-200 flex items-center justify-center text-terracotta-600 mx-auto shadow-warm-sm">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-2xl text-charcoal-900">Your basket is empty</h2>
        <p className="text-sm text-stone-warm-600">Add handmade creations to your cart before proceeding to checkout.</p>
        <Link to="/catalog">
          <Button size="md">Explore Catalog</Button>
        </Link>
      </div>
    );
  }

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStateName = e.target.value;
    const found = INDIAN_STATES.find((s) => s.name === selectedStateName);
    setFormData((prev) => ({
      ...prev,
      state: selectedStateName,
      stateCode: found ? found.code : '19',
    }));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!user) {
      // Save form state and redirect to login
      navigate('/login?redirect=/checkout');
      return;
    }

    if (!formData.name || !formData.phone || !formData.street || !formData.city || !formData.pincode) {
      setErrorMsg('Please fill in all mandatory shipping address fields.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        shippingAddress: {
          name: formData.name,
          phone: formData.phone,
          street: formData.street,
          landmark: formData.landmark || undefined,
          city: formData.city,
          state: formData.state,
          stateCode: formData.stateCode,
          pincode: formData.pincode,
        },
        billingAddress: {
          name: formData.name,
          phone: formData.phone,
          street: formData.street,
          landmark: formData.landmark || undefined,
          city: formData.city,
          state: formData.state,
          stateCode: formData.stateCode,
          pincode: formData.pincode,
        },
        items: items.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          customisationNote: item.customisationNote || '',
        })),
      };

      const res = await api.post<CheckoutResponse>('/orders/checkout', payload);

      if (res && res.order) {
        clearCart();
        navigate(`/order-success/${res.order._id || res.order.orderNumber}`);
      } else {
        throw new Error('Could not complete checkout');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Checkout failed. Please check stock or try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      <div className="mb-8">
        <h1 className="font-display font-black text-3xl text-charcoal-900 tracking-tight">
          Secure Indian Artisan Checkout
        </h1>
        <p className="text-xs sm:text-sm text-stone-warm-600 mt-1">
          Review your multi-vendor artisan cart and provide your insured delivery address.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {!user && (
        <div className="mb-8 p-6 bg-terracotta-50 border border-terracotta-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-terracotta-600 text-white flex items-center justify-center font-bold text-lg">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-charcoal-900">Sign in for fastest checkout</h4>
              <p className="text-xs text-stone-warm-600">Save delivery addresses and track live courier shipments.</p>
            </div>
          </div>
          <Link to="/login?redirect=/checkout">
            <Button size="sm" variant="primary">
              Sign In / Register &rarr;
            </Button>
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT: Shipping Address Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-warm-200 p-6 sm:p-8 shadow-warm-sm space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-stone-warm-100">
              <Truck className="w-5 h-5 text-terracotta-600" />
              <h2 className="font-display font-bold text-lg text-charcoal-900">1. Delivery Address</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Recipient Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Ananya Sen"
              />

              <Input
                label="Phone Number (10 Digits)"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. 9876543210"
              />
            </div>

            <Input
              label="Flat / House / Street Address"
              required
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              placeholder="e.g. 42A, Rashbehari Avenue, Flat 3B"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Landmark (Optional)"
                value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                placeholder="e.g. Near Kalighat Metro"
              />

              <Input
                label="City / District"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Kolkata"
              />

              <Input
                label="PIN Code (6 Digits)"
                required
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="e.g. 700029"
              />
            </div>

            <Select
              label="State / Union Territory"
              value={formData.state}
              onChange={handleStateChange}
            >
              {INDIAN_STATES.map((s) => (
                <option key={s.code} value={s.name}>
                  {s.name} (Code {s.code})
                </option>
              ))}
            </Select>
          </div>

          {/* Payment Method Option */}
          <div className="bg-white rounded-3xl border border-stone-warm-200 p-6 sm:p-8 shadow-warm-sm space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-stone-warm-100">
              <Lock className="w-5 h-5 text-terracotta-600" />
              <h2 className="font-display font-bold text-lg text-charcoal-900">2. Payment Method</h2>
            </div>

            <div className="p-4 rounded-2xl border-2 border-terracotta-500 bg-terracotta-50/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full border-4 border-terracotta-600 bg-white" />
                <div>
                  <p className="text-xs font-bold text-charcoal-900">
                    Secure Indian Artisan Escrow (UPI, Netbanking &amp; Cards)
                  </p>
                  <p className="text-[11px] text-stone-warm-600">
                    Insured escrow payment with automatic artisan settlement &amp; statutory GST invoicing
                  </p>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* RIGHT: Multi-vendor Review & Pricing Breakdown */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-stone-warm-200 p-6 sm:p-8 shadow-warm-sm space-y-6">
            <h2 className="font-display font-bold text-lg text-charcoal-900 pb-4 border-b border-stone-warm-100">
              Order Summary ({sellerGroups.length} {sellerGroups.length === 1 ? 'Creator Studio' : 'Creator Studios'})
            </h2>

            {/* Vendor Groupings */}
            <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
              {sellerGroups.map((group) => (
                <div
                  key={group.sellerId}
                  className="p-4 rounded-2xl bg-stone-warm-50 border border-stone-warm-200/80 space-y-3"
                >
                  <div className="flex items-center gap-2 pb-2 border-b border-stone-warm-200">
                    <Store className="w-4 h-4 text-terracotta-600" />
                    <span className="text-xs font-bold text-charcoal-800">
                      {group.shopName}
                    </span>
                  </div>

                  {group.items.map((item) => (
                    <div key={`${item.productId}-${item.customisationNote || ''}`} className="flex gap-3 text-xs">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-12 h-12 rounded-xl object-cover border border-stone-warm-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-charcoal-900 line-clamp-1">{item.title}</p>
                        <p className="text-stone-warm-600 text-[11px]">
                          Qty: {item.qty} &times; {formatINR(item.price)}
                        </p>
                        {item.customisationNote && (
                          <p className="text-[10px] text-terracotta-800 italic line-clamp-1">
                            &ldquo;{item.customisationNote}&rdquo;
                          </p>
                        )}
                      </div>
                      <span className="font-bold text-charcoal-900">
                        {formatINR(item.price * item.qty)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Price Calculations */}
            <div className="space-y-2 pt-4 border-t border-stone-warm-200 text-xs">
              <div className="flex items-center justify-between text-stone-warm-700">
                <span>Items Subtotal</span>
                <span className="font-semibold text-charcoal-900">{formatINR(subtotalPaise)}</span>
              </div>

              <div className="flex items-center justify-between text-stone-warm-700">
                <span>Fragile Craft Shipping</span>
                <span className="font-semibold text-emerald-700">
                  {shippingPaise === 0 ? 'FREE (Promo)' : formatINR(shippingPaise)}
                </span>
              </div>

              <div className="flex items-center justify-between text-stone-warm-700">
                <span>GST & Statutory Taxes</span>
                <span className="text-stone-warm-500">Included in prices</span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-stone-warm-200 text-sm font-display font-black text-charcoal-900">
                <span>Total Amount</span>
                <span className="text-xl text-terracotta-700">{formatINR(totalPayablePaise)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              variant="primary"
              className="w-full shadow-warm-md"
              isLoading={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Pay {formatINR(totalPayablePaise)} & Place Order
            </Button>

            <p className="text-[11px] text-center text-stone-warm-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Instant Tax Invoice & Live Artisan Tracking Generated</span>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
