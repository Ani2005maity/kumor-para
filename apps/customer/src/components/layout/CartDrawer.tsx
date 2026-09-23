import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { X, ShoppingBag, Trash2, Plus, Minus, Store, ArrowRight, Sparkles } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { formatINR } from '../../lib/utils';
import { Button } from '../common/Button';

export const CartDrawer: React.FC = () => {
  const {
    isDrawerOpen,
    closeDrawer,
    items,
    updateQty,
    removeItem,
    getSubtotalPaise,
    getSellerGroups,
  } = useCartStore();

  const navigate = useNavigate();
  const subtotalPaise = getSubtotalPaise();
  const sellerGroups = getSellerGroups();

  if (!isDrawerOpen) return null;

  const handleProceedCheckout = () => {
    closeDrawer();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={closeDrawer}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FAF8F5] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="px-6 py-5 bg-white border-b border-stone-warm-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-terracotta-50 text-terracotta-600">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-display font-bold text-charcoal-900">Your Craft Basket</h2>
                <p className="text-xs text-stone-warm-500">
                  {items.length} {items.length === 1 ? 'item' : 'items'} from {sellerGroups.length}{' '}
                  {sellerGroups.length === 1 ? 'artisan' : 'artisans'}
                </p>
              </div>
            </div>
            <button
              onClick={closeDrawer}
              className="p-2 text-stone-warm-500 hover:text-charcoal-900 rounded-xl hover:bg-stone-warm-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-terracotta-50 border border-terracotta-200 flex items-center justify-center mx-auto text-terracotta-600 shadow-warm-sm">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-display font-bold text-charcoal-900">Your basket is empty</h3>
                  <p className="text-xs text-stone-warm-600 max-w-xs mx-auto">
                    Explore master handcrafted creations from independent Indian artisans.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    closeDrawer();
                    navigate('/catalog');
                  }}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  Explore Creations
                </Button>
              </div>
            ) : (
              sellerGroups.map((group) => (
                <div
                  key={group.sellerId}
                  className="bg-white rounded-2xl border border-stone-warm-200 overflow-hidden shadow-warm-sm"
                >
                  {/* Artisan Studio Header */}
                  <div className="px-4 py-2.5 bg-stone-warm-100/70 border-b border-stone-warm-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-terracotta-600" />
                      <span className="text-xs font-bold text-charcoal-800">
                        {group.shopName}
                      </span>
                    </div>
                    {group.shopSlug && (
                      <Link
                        to={`/shop/${group.shopSlug}`}
                        onClick={closeDrawer}
                        className="text-[11px] font-semibold text-terracotta-600 hover:underline"
                      >
                        Visit Studio &rarr;
                      </Link>
                    )}
                  </div>

                  {/* Items for this Seller */}
                  <div className="divide-y divide-stone-warm-100">
                    {group.items.map((item) => (
                      <div key={`${item.productId}-${item.customisationNote || ''}`} className="p-4 flex gap-3.5">
                        {/* Thumbnail */}
                        <Link
                          to={`/product/${item.slug || item.productId}`}
                          onClick={closeDrawer}
                          className="w-18 h-18 w-20 h-20 rounded-xl overflow-hidden bg-stone-warm-100 shrink-0 border border-stone-warm-200 group"
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <Link
                              to={`/product/${item.slug || item.productId}`}
                              onClick={closeDrawer}
                              className="text-xs font-bold text-charcoal-900 hover:text-terracotta-600 line-clamp-1 transition-colors"
                            >
                              {item.title}
                            </Link>
                            <p className="text-xs font-semibold text-terracotta-700 mt-0.5">
                              {formatINR(item.price)}
                            </p>
                            {item.customisationNote && (
                              <p className="text-[11px] text-stone-warm-600 bg-stone-warm-50 border border-stone-warm-200 rounded px-2 py-0.5 mt-1 italic line-clamp-1">
                                Note: &ldquo;{item.customisationNote}&rdquo;
                              </p>
                            )}
                          </div>

                          {/* Quantity & Remove controls */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center border border-stone-warm-300 rounded-lg bg-stone-warm-50 overflow-hidden">
                              <button
                                onClick={() =>
                                  updateQty(item.productId, item.qty - 1, item.customisationNote)
                                }
                                className="p-1 hover:bg-stone-warm-200 text-charcoal-700 transition-colors"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-2.5 text-xs font-semibold text-charcoal-900">
                                {item.qty}
                              </span>
                              <button
                                onClick={() =>
                                  updateQty(item.productId, item.qty + 1, item.customisationNote)
                                }
                                className="p-1 hover:bg-stone-warm-200 text-charcoal-700 transition-colors"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeItem(item.productId, item.customisationNote)}
                              className="text-stone-warm-400 hover:text-red-600 p-1 transition-colors"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout Action */}
          {items.length > 0 && (
            <div className="p-6 bg-white border-t border-stone-warm-200 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-warm-600">Subtotal</span>
                  <span className="font-bold text-charcoal-900">{formatINR(subtotalPaise)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-warm-500">
                  <span>Shipping & GST</span>
                  <span className="text-emerald-700 font-semibold">Calculated at checkout</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleProceedCheckout}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Checkout ({formatINR(subtotalPaise)})
              </Button>

              <p className="text-[11px] text-center text-stone-warm-500">
                Safe & Secure Indian Escrow Checkout &bull; Direct Artisan Payouts
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
