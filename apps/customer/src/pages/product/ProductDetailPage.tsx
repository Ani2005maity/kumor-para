import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Store,
  MapPin,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Package,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useCartStore } from '../../store/useCartStore';

interface ProductDetail {
  _id: string;
  title: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  fulfilmentType: 'ready_stock' | 'made_to_order';
  productionDays?: number;
  leadTimeDays?: number;
  isCustomisable?: boolean;
  customisationAvailable?: boolean;
  materials?: string[];
  colors?: string[];
  dimensions?: {
    l: number;
    w: number;
    h: number;
    unit: string;
  };
  weightGrams?: number;
  hsnCode?: string;
  gstRate?: number;
  images: Array<{ url: string; alt?: string }>;
  rating?: number;
  reviewCount?: number;
  sellerId?: {
    _id: string;
    shopName: string;
    slug: string;
    location?: string;
    bio?: string;
    rating?: number;
  };
  categoryId?: {
    _id: string;
    name: string;
    slug: string;
  };
}

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();

  const [selectedImgIndex, setSelectedImgIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [customisationNote, setCustomisationNote] = useState('');
  const [activeTab, setActiveTab] = useState<'story' | 'materials' | 'dimensions' | 'shipping'>('story');

  const { data: product, isLoading, isError } = useQuery<ProductDetail>({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await api.get<{ product: ProductDetail }>(`/products/${slug}`);
      return res.product;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-stone-warm-200 rounded-3xl animate-pulse" />
          <div className="space-y-6">
            <div className="h-8 bg-stone-warm-200 rounded-lg w-3/4 animate-pulse" />
            <div className="h-6 bg-stone-warm-200 rounded-lg w-1/4 animate-pulse" />
            <div className="h-32 bg-stone-warm-200 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-terracotta-50 border border-terracotta-200 flex items-center justify-center text-terracotta-600 mx-auto">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-2xl text-charcoal-900">Creation Not Found</h2>
        <p className="text-sm text-stone-warm-600">
          The handcrafted creation you are looking for might have been retired or does not exist.
        </p>
        <Link to="/catalog">
          <Button size="md">Explore All Collections</Button>
        </Link>
      </div>
    );
  }

  const customisable = product.isCustomisable ?? product.customisationAvailable ?? false;
  const leadDays = product.productionDays ?? product.leadTimeDays ?? 7;

  const images = product.images && product.images.length > 0
    ? product.images
    : [{ url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=80', alt: product.title }];

  const handleAddToCart = () => {
    addItem({
      productId: product._id,
      sellerId: product.sellerId?._id || 'artisan',
      shopName: product.sellerId?.shopName || 'Artisan Studio',
      shopSlug: product.sellerId?.slug,
      title: product.title,
      slug: product.slug,
      image: images[0].url,
      price: product.price,
      stock: product.stock,
      fulfilmentType: product.fulfilmentType,
      productionDays: leadDays,
      customisationNote: customisationNote.trim() || undefined,
      isCustomisable: customisable,
      qty,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14 space-y-16">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-medium text-stone-warm-600">
        <Link to="/" className="hover:text-terracotta-600 transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link to="/catalog" className="hover:text-terracotta-600 transition-colors">
          Catalog
        </Link>
        {product.categoryId && (
          <>
            <span>/</span>
            <Link
              to={`/catalog?category=${encodeURIComponent(product.categoryId.name)}`}
              className="hover:text-terracotta-600 transition-colors"
            >
              {product.categoryId.name}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-charcoal-800 font-bold truncate max-w-xs">{product.title}</span>
      </div>

      {/* Main Product Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
        {/* LEFT: Photo Gallery */}
        <div className="lg:col-span-6 space-y-4">
          {/* Main Selected Image */}
          <div className="aspect-square rounded-3xl overflow-hidden bg-stone-warm-100 border border-stone-warm-200/80 shadow-warm-md relative">
            <img
              src={images[selectedImgIndex]?.url || images[0].url}
              alt={product.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4">
              <Badge
                variant={product.fulfilmentType === 'ready_stock' ? 'emerald' : 'ochre'}
                size="md"
              >
                {product.fulfilmentType === 'ready_stock'
                  ? 'Ready Stock'
                  : `Made to Order (${leadDays} days craft time)`}
              </Badge>
            </div>
          </div>

          {/* Thumbnail Switcher */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImgIndex(idx)}
                  className={`w-20 h-20 rounded-2xl overflow-hidden border-2 shrink-0 transition-all ${
                    selectedImgIndex === idx
                      ? 'border-terracotta-600 shadow-warm-md scale-105'
                      : 'border-stone-warm-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Product Specs & Actions */}
        <div className="lg:col-span-6 space-y-6">
          {/* Maker Info Card */}
          {product.sellerId && (
            <Link
              to={`/shop/${product.sellerId.slug}`}
              className="group inline-flex items-center gap-3 p-3 bg-stone-warm-100/80 hover:bg-stone-warm-200/80 border border-stone-warm-200 rounded-2xl transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-terracotta-600 text-white flex items-center justify-center font-bold text-base shadow-warm-sm">
                <Store className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-warm-500">
                  Crafted by Studio
                </p>
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-bold text-sm text-charcoal-900 group-hover:text-terracotta-600 transition-colors">
                    {product.sellerId.shopName}
                  </h4>
                  {product.sellerId.location && (
                    <span className="text-xs text-stone-warm-600 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-terracotta-500" />
                      {product.sellerId.location}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-warm-400 group-hover:text-terracotta-600 group-hover:translate-x-0.5 transition-all ml-auto pr-1" />
            </Link>
          )}

          {/* Title & Ratings */}
          <div className="space-y-2">
            <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-charcoal-900 tracking-tight leading-tight">
              {product.title}
            </h1>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-ochre-400 text-ochre-400" />
                <span className="font-bold text-sm text-charcoal-900">
                  {product.rating ? product.rating.toFixed(1) : '4.9'}
                </span>
                <span className="text-xs text-stone-warm-500">
                  ({product.reviewCount || 18} reviews)
                </span>
              </div>
              <span className="text-stone-warm-300">&bull;</span>
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Verified Handmade
              </span>
            </div>
          </div>

          {/* Pricing & Tax Note */}
          <div className="p-5 bg-white rounded-2xl border border-stone-warm-200/90 shadow-warm-sm space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="font-display font-black text-3xl sm:text-4xl text-charcoal-900">
                {formatINR(product.price)}
              </span>
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md">
                Inclusive of all taxes & GST
              </span>
            </div>
            <p className="text-xs text-stone-warm-500">
              Direct artisan price &bull; Zero middlemen markups &bull; GST Tax Invoice included
            </p>
          </div>

          {/* Customisation Option Box (If Available) */}
          {customisable && (
            <div className="p-5 bg-terracotta-50/70 rounded-2xl border border-terracotta-200/80 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-terracotta-600" />
                <label
                  htmlFor="customisationNote"
                  className="font-display font-bold text-xs uppercase tracking-wider text-terracotta-900"
                >
                  Customisation & Personalisation
                </label>
              </div>
              <p className="text-xs text-terracotta-800">
                This creator accepts custom orders. Mention your initial engraving, color palette, or specific size requirements:
              </p>
              <textarea
                id="customisationNote"
                rows={2}
                value={customisationNote}
                onChange={(e) => setCustomisationNote(e.target.value.slice(0, 300))}
                placeholder="e.g. Please engrave initials 'A.M.' or request deep indigo glaze tone..."
                className="w-full rounded-xl border border-terracotta-300 bg-white p-3 text-xs text-charcoal-900 placeholder:text-stone-warm-400 focus:outline-none focus:ring-2 focus:ring-terracotta-500/20"
              />
              <p className="text-[11px] text-right text-stone-warm-500">
                {customisationNote.length}/300 characters
              </p>
            </div>
          )}

          {/* Stock & Quantity Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-charcoal-700">Quantity</span>
              {product.fulfilmentType === 'ready_stock' ? (
                <span className="text-stone-warm-600">
                  {product.stock > 0 ? `${product.stock} units ready in workshop` : 'Out of Stock'}
                </span>
              ) : (
                <span className="text-ochre-700 font-medium">
                  Crafted on order ({leadDays} business days)
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border border-stone-warm-300 rounded-xl bg-white shadow-warm-sm overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="p-3 hover:bg-stone-warm-100 text-charcoal-800 transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-5 font-bold text-sm text-charcoal-900">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock > 0 ? product.stock : 99, qty + 1))}
                  className="p-3 hover:bg-stone-warm-100 text-charcoal-800 transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Total Subtotal for selected qty */}
              <div className="text-xs text-stone-warm-600">
                Total:{' '}
                <span className="font-bold text-charcoal-900 text-sm">
                  {formatINR(product.price * qty)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Button
              variant="outline"
              size="lg"
              onClick={handleAddToCart}
              leftIcon={<ShoppingBag className="w-4 h-4" />}
            >
              Add to Basket
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleBuyNow}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Buy Now
            </Button>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-stone-warm-200 text-center">
            <div className="p-3 rounded-xl bg-white border border-stone-warm-200/60 shadow-warm-sm">
              <Truck className="w-5 h-5 text-terracotta-600 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-charcoal-900">Insured Shipping</p>
              <p className="text-[10px] text-stone-warm-500">Safe pottery transit</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-stone-warm-200/60 shadow-warm-sm">
              <ShieldCheck className="w-5 h-5 text-terracotta-600 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-charcoal-900">Authentic Art</p>
              <p className="text-[10px] text-stone-warm-500">Direct from artisan</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-stone-warm-200/60 shadow-warm-sm">
              <RotateCcw className="w-5 h-5 text-terracotta-600 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-charcoal-900">Damage Free</p>
              <p className="text-[10px] text-stone-warm-500">100% replacement</p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS SECTION: Story, Materials, Dimensions, Shipping */}
      <div className="bg-white rounded-3xl border border-stone-warm-200 p-6 sm:p-10 shadow-warm-sm space-y-8">
        {/* Tab Headers */}
        <div className="flex items-center gap-2 sm:gap-4 border-b border-stone-warm-200 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('story')}
            className={`pb-4 px-3 text-xs sm:text-sm font-display font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'story'
                ? 'border-terracotta-600 text-terracotta-700'
                : 'border-transparent text-stone-warm-600 hover:text-charcoal-900'
            }`}
          >
            Artisan Story & Craft
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`pb-4 px-3 text-xs sm:text-sm font-display font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'materials'
                ? 'border-terracotta-600 text-terracotta-700'
                : 'border-transparent text-stone-warm-600 hover:text-charcoal-900'
            }`}
          >
            Materials & Care
          </button>
          <button
            onClick={() => setActiveTab('dimensions')}
            className={`pb-4 px-3 text-xs sm:text-sm font-display font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'dimensions'
                ? 'border-terracotta-600 text-terracotta-700'
                : 'border-transparent text-stone-warm-600 hover:text-charcoal-900'
            }`}
          >
            Dimensions & GST
          </button>
          <button
            onClick={() => setActiveTab('shipping')}
            className={`pb-4 px-3 text-xs sm:text-sm font-display font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'shipping'
                ? 'border-terracotta-600 text-terracotta-700'
                : 'border-transparent text-stone-warm-600 hover:text-charcoal-900'
            }`}
          >
            Packaging & Delivery
          </button>
        </div>

        {/* Tab Content */}
        <div className="text-sm text-charcoal-800 leading-relaxed max-w-4xl">
          {activeTab === 'story' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg text-charcoal-900">About this creation</h3>
              <p className="whitespace-pre-line text-stone-warm-700">
                {product.description ||
                  'Every piece is handmade with meticulous attention to detail by master craftspeople using traditional Indian art methods.'}
              </p>
            </div>
          )}

          {activeTab === 'materials' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg text-charcoal-900">Materials & Composition</h3>
              {product.materials && product.materials.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.materials.map((m, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-stone-warm-100 border border-stone-warm-300 text-xs font-semibold text-charcoal-800"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-stone-warm-600 text-xs">Authentic Indian natural craft materials.</p>
              )}
            </div>
          )}

          {activeTab === 'dimensions' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg text-charcoal-900">Technical Specifications</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {product.dimensions && (
                  <div className="p-3 bg-stone-warm-50 rounded-xl border border-stone-warm-200">
                    <span className="text-[11px] text-stone-warm-500 block">Dimensions (L&times;W&times;H)</span>
                    <span className="font-bold text-charcoal-900 text-xs">
                      {product.dimensions.l} &times; {product.dimensions.w} &times; {product.dimensions.h}{' '}
                      {product.dimensions.unit}
                    </span>
                  </div>
                )}
                {product.weightGrams && (
                  <div className="p-3 bg-stone-warm-50 rounded-xl border border-stone-warm-200">
                    <span className="text-[11px] text-stone-warm-500 block">Weight</span>
                    <span className="font-bold text-charcoal-900 text-xs">
                      {product.weightGrams} grams
                    </span>
                  </div>
                )}
                <div className="p-3 bg-stone-warm-50 rounded-xl border border-stone-warm-200">
                  <span className="text-[11px] text-stone-warm-500 block">HSN Code</span>
                  <span className="font-bold text-charcoal-900 text-xs">
                    {product.hsnCode || '6912'}
                  </span>
                </div>
                <div className="p-3 bg-stone-warm-50 rounded-xl border border-stone-warm-200">
                  <span className="text-[11px] text-stone-warm-500 block">Applicable GST</span>
                  <span className="font-bold text-charcoal-900 text-xs">
                    {product.gstRate ?? 12}% (Included)
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipping' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-lg text-charcoal-900">
                Fragile Care & Pan-India Dispatch
              </h3>
              <p className="text-stone-warm-700 text-xs sm:text-sm">
                Pottery and fragile artisanal goods are wrapped in multi-layered honeycomb paper, biodegradable bubble insulation, and rigid outer corrugation to survive long-distance transit.
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-stone-warm-600">
                <li>Ready Stock orders dispatch within 24 to 48 hours.</li>
                <li>Made to Order creations take {leadDays} business days to craft prior to dispatch.</li>
                <li>Full transit insurance with replacement guarantee in case of courier damage.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
