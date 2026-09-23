import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  Truck,
  Award,
  Star,
  MapPin,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, LAUNCH_CATEGORIES } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { useCartStore } from '../../store/useCartStore';

interface ProductItem {
  _id: string;
  title: string;
  slug: string;
  price: number;
  stock: number;
  fulfilmentType: 'ready_stock' | 'made_to_order';
  productionDays?: number;
  images: Array<{ url: string; alt?: string }>;
  rating?: number;
  reviewCount?: number;
  sellerId?: {
    _id: string;
    shopName: string;
    slug: string;
    location?: string;
  };
  categoryId?: {
    name: string;
    slug: string;
  };
}

export const HomePage: React.FC = () => {
  const { addItem } = useCartStore();

  // Fetch Featured Creations
  const { data: featuredData, isLoading: isFeaturedLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const res = await api.get<{ products: ProductItem[] }>('/products/featured');
      return res?.products || [];
    },
  });

  // Fetch Recent Approved Catalog
  const { data: catalogData } = useQuery({
    queryKey: ['home-catalog'],
    queryFn: async () => {
      const res = await api.get<{ products: ProductItem[] }>('/products?limit=8&sortBy=newest');
      return res?.products || [];
    },
  });

  const productsToShow =
    featuredData && featuredData.length > 0
      ? featuredData
      : catalogData && catalogData.length > 0
      ? catalogData
      : [];

  const handleQuickAdd = (p: ProductItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: p._id,
      sellerId: p.sellerId?._id || 'artisan',
      shopName: p.sellerId?.shopName || 'Artisan Studio',
      shopSlug: p.sellerId?.slug,
      title: p.title,
      slug: p.slug,
      image: p.images?.[0]?.url || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80',
      price: p.price,
      stock: p.stock,
      fulfilmentType: p.fulfilmentType,
      productionDays: p.productionDays,
      qty: 1,
    });
  };

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. EDITORIAL HERO SECTION */}
      <section className="relative overflow-hidden bg-radial-hero pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-stone-warm-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-terracotta-100/80 border border-terracotta-200 text-terracotta-900 text-xs font-semibold tracking-wide shadow-warm-sm">
                <Sparkles className="w-3.5 h-3.5 text-terracotta-600 animate-pulse" />
                <span>India&apos;s Sovereign Handmade Marketplace</span>
              </div>

              <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-6xl text-charcoal-900 tracking-tight leading-[1.15]">
                Handcrafted Treasures, Direct from{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-terracotta-600 via-ochre-600 to-terracotta-700">
                  Master Artisans
                </span>
                .
              </h1>

              <p className="text-base sm:text-lg text-stone-warm-700 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Connect directly with independent creators across Bengal, Rajasthan, Gujarat, and Kashmir.
                From Bankura terracotta and Shantiniketan embossed leather to Dokra brass metalwork — every creation carries a living legacy.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link to="/catalog">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto shadow-warm-md"
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Explore Curated Crafts
                  </Button>
                </Link>
                <a
                  href="#featured-studios"
                  className="w-full sm:w-auto inline-flex items-center justify-center font-medium text-sm px-6 py-3.5 rounded-xl border border-stone-warm-300 bg-white hover:bg-stone-warm-100 text-charcoal-800 transition-colors shadow-warm-sm"
                >
                  Meet Creator Studios
                </a>
              </div>

              {/* Trust Metrics Pill */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-stone-warm-300/60 max-w-md mx-auto lg:mx-0 text-left">
                <div>
                  <p className="font-display font-black text-2xl text-terracotta-700">100%</p>
                  <p className="text-xs text-stone-warm-600 font-medium">Verified Handmade</p>
                </div>
                <div>
                  <p className="font-display font-black text-2xl text-charcoal-900">0%</p>
                  <p className="text-xs text-stone-warm-600 font-medium">Middlemen Markups</p>
                </div>
                <div>
                  <p className="font-display font-black text-2xl text-terracotta-700">₹0</p>
                  <p className="text-xs text-stone-warm-600 font-medium">Listing Fees for Makers</p>
                </div>
              </div>
            </div>

            {/* Right Editorial Showcase Collage */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-stone-warm-200">
                  <img
                    src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&q=85"
                    alt="Handmade Pottery Vase by Mrittika Studio"
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  />
                </div>

                {/* Floating Artisan Card 1 */}
                <div className="absolute -bottom-6 -left-6 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-warm-xl border border-stone-warm-200 max-w-[240px] animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-terracotta-100 flex items-center justify-center text-terracotta-600">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-charcoal-900">Mrittika Studio</h4>
                      <p className="text-[11px] text-stone-warm-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-terracotta-500" /> Kolkata, WB
                      </p>
                    </div>
                  </div>
                  <p className="text-[11px] text-charcoal-700 mt-2 italic">
                    &ldquo;Preserving 3 generations of terracotta pottery craft.&rdquo;
                  </p>
                </div>

                {/* Floating Badge 2 */}
                <div className="absolute -top-4 -right-4 bg-charcoal-900 text-white rounded-2xl p-3 shadow-warm-xl border border-charcoal-800 flex items-center gap-2">
                  <Award className="w-4 h-4 text-ochre-400" />
                  <span className="text-xs font-bold tracking-wide">GI Craft Heritage</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. CURATED CATEGORY STRIP */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-terracotta-600">
            Heritage Collections
          </h2>
          <h3 className="font-display font-black text-3xl text-charcoal-900 tracking-tight">
            Explore Master Craft Traditions
          </h3>
          <p className="text-sm text-stone-warm-600">
            Handcrafted with age-old techniques passed down through generations of master artisans.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {LAUNCH_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              to={`/catalog?category=${encodeURIComponent(cat.name)}`}
              className="group relative rounded-2xl overflow-hidden border border-stone-warm-200 bg-white shadow-warm-sm hover:shadow-warm-xl transition-all duration-300 hover:-translate-y-1"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-stone-warm-100">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <div className="p-4 bg-white text-center">
                <h4 className="font-display font-bold text-sm text-charcoal-900 group-hover:text-terracotta-600 transition-colors">
                  {cat.name}
                </h4>
                <p className="text-[11px] text-stone-warm-500 line-clamp-2 mt-1">
                  {cat.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. FEATURED ARTISAN CREATIONS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-terracotta-600">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Artisan Spotlight</span>
            </div>
            <h3 className="font-display font-black text-3xl text-charcoal-900 tracking-tight mt-1">
              Curated Masterpieces
            </h3>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1 text-sm font-bold text-terracotta-700 hover:text-terracotta-800 transition-colors"
          >
            <span>View All Catalog ({productsToShow.length > 0 ? `${productsToShow.length}+` : 'Explore'})</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isFeaturedLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-stone-warm-200/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : productsToShow.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-stone-warm-200 p-8 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-terracotta-50 border border-terracotta-200 flex items-center justify-center text-terracotta-600 mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-charcoal-900">New creations arriving soon</h4>
            <p className="text-sm text-stone-warm-600 max-w-md mx-auto">
              Our registered Indian creators are firing pottery and handcrafting exquisite pieces. Check out the catalog!
            </p>
            <Link to="/catalog">
              <Button size="md">Browse Catalog</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {productsToShow.map((product) => {
              const mainImg =
                product.images?.[0]?.url ||
                'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80';
              return (
                <div
                  key={product._id}
                  className="group bg-white rounded-2xl border border-stone-warm-200 overflow-hidden shadow-warm-sm hover:shadow-warm-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
                >
                  <Link to={`/product/${product.slug || product._id}`} className="block relative">
                    <div className="aspect-square overflow-hidden bg-stone-warm-100 relative">
                      <img
                        src={mainImg}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Fulfilment Badge */}
                      <div className="absolute top-3 left-3">
                        <Badge
                          variant={product.fulfilmentType === 'ready_stock' ? 'emerald' : 'ochre'}
                          size="sm"
                        >
                          {product.fulfilmentType === 'ready_stock'
                            ? 'Ready Stock'
                            : `Made to Order (${product.productionDays || 7}d)`}
                        </Badge>
                      </div>
                    </div>
                  </Link>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      {/* Seller Tag */}
                      {product.sellerId && (
                        <Link
                          to={`/shop/${product.sellerId.slug}`}
                          className="text-[11px] font-semibold text-terracotta-700 hover:underline flex items-center gap-1"
                        >
                          <span>{product.sellerId.shopName}</span>
                          {product.sellerId.location && (
                            <span className="text-stone-warm-500 font-normal">
                              &bull; {product.sellerId.location}
                            </span>
                          )}
                        </Link>
                      )}

                      <Link
                        to={`/product/${product.slug || product._id}`}
                        className="block font-display font-bold text-sm text-charcoal-900 hover:text-terracotta-600 transition-colors line-clamp-2 leading-snug"
                      >
                        {product.title}
                      </Link>

                      {/* Ratings */}
                      <div className="flex items-center gap-1 text-xs text-stone-warm-600">
                        <Star className="w-3.5 h-3.5 fill-ochre-400 text-ochre-400" />
                        <span className="font-bold text-charcoal-800">
                          {product.rating ? product.rating.toFixed(1) : '4.9'}
                        </span>
                        <span className="text-stone-warm-500">
                          ({product.reviewCount || 12})
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-stone-warm-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-stone-warm-500 block">Price</span>
                        <span className="font-display font-extrabold text-base text-charcoal-900">
                          {formatINR(product.price)}
                        </span>
                      </div>

                      <button
                        onClick={(e) => handleQuickAdd(product, e)}
                        className="p-2.5 rounded-xl bg-stone-warm-100 hover:bg-terracotta-600 hover:text-white text-charcoal-800 transition-all shadow-warm-sm"
                        aria-label="Add to Basket"
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. MEET THE MASTER ARTISANS */}
      <section className="bg-charcoal-900 text-white py-16 sm:py-24 rounded-3xl sm:rounded-[2.5rem] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden relative shadow-warm-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-terracotta-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-terracotta-400">
              Regional Artisan Guilds
            </h2>
            <h3 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight">
              Meet Independent Indian Creators
            </h3>
            <p className="text-sm text-stone-warm-400">
              Every creation carries the signature touch and generational legacy of master craftsmen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            {/* Studio 1: Mrittika Studio */}
            <div className="bg-stone-warm-800/80 rounded-2xl p-6 sm:p-8 border border-stone-warm-700/60 backdrop-blur-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-terracotta-600 flex items-center justify-center text-white shadow-warm-md">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white font-display">Mrittika Studio</h4>
                      <p className="text-xs text-stone-warm-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-terracotta-400" /> Kumartuli &bull; Kolkata, WB
                      </p>
                    </div>
                  </div>
                  <Badge variant="terracotta" size="sm">Master Potter</Badge>
                </div>

                <p className="text-xs text-stone-warm-300 leading-relaxed">
                  Founded by Debjani Mukherjee, Mrittika Studio specialises in hand-thrown terracotta dinnerware, natural unglazed kulhars, and intricate Bankura clay sculptures made using river Ganges clay.
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-stone-warm-700/60 text-stone-warm-300 border border-stone-warm-600">
                    Terracotta Pottery
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-stone-warm-700/60 text-stone-warm-300 border border-stone-warm-600">
                    Lead-Free Food Safe
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-stone-warm-700/60 text-stone-warm-300 border border-stone-warm-600">
                    Wheel Thrown
                  </span>
                </div>
              </div>

              <Link to="/shop/mrittika-studio">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full text-stone-warm-100 border-stone-warm-600 hover:bg-stone-warm-700 hover:border-stone-warm-500"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Visit Mrittika Studio &rarr;
                </Button>
              </Link>
            </div>

            {/* Studio 2: Shantiniketan Leather */}
            <div className="bg-stone-warm-800/80 rounded-2xl p-6 sm:p-8 border border-stone-warm-700/60 backdrop-blur-sm flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-ochre-600 flex items-center justify-center text-white shadow-warm-md">
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-white font-display">Shantiniketan Leather</h4>
                      <p className="text-xs text-stone-warm-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-ochre-400" /> Bolpur &bull; Shantiniketan, WB
                      </p>
                    </div>
                  </div>
                  <Badge variant="ochre" size="sm">GI Tagged Craft</Badge>
                </div>

                <p className="text-xs text-stone-warm-300 leading-relaxed">
                  Led by master craftsman Biren Ghosh, crafting authentic GI-tagged vegetable-tanned sheepskin leather bags, wallets, and embossed journals inspired by Rabindranath Tagore&apos;s Visva-Bharati aesthetic.
                </p>

                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-stone-warm-700/60 text-stone-warm-300 border border-stone-warm-600">
                    Hand-Batik Dyeing
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-stone-warm-700/60 text-stone-warm-300 border border-stone-warm-600">
                    Vegetable Tanned
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-stone-warm-700/60 text-stone-warm-300 border border-stone-warm-600">
                    Tagore Heritage
                  </span>
                </div>
              </div>

              <Link to="/shop/shantiniketan-leather">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full text-stone-warm-100 border-stone-warm-600 hover:bg-stone-warm-700 hover:border-stone-warm-500"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Visit Shantiniketan Studio &rarr;
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. CREATOR ONBOARDING CALLOUT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-radial-craft rounded-3xl p-8 sm:p-12 border border-stone-warm-300/80 shadow-warm-md flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-widest text-terracotta-700">
              For Independent Artisans
            </span>
            <h3 className="font-display font-black text-2xl sm:text-3xl text-charcoal-900 tracking-tight">
              Create Your Digital Studio on Kumor Para
            </h3>
            <p className="text-sm text-stone-warm-700 leading-relaxed">
              Are you an Indian potter, weaver, sculptor, or leathercraft artisan? Join Kumor Para to reach patrons across India with zero upfront fees, automated GST invoicing, and direct bank settlements.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <a
              href={import.meta.env.VITE_SELLER_URL || 'http://localhost:5174'}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto"
            >
              <Button size="lg" className="w-full shadow-warm-md">
                Register as Artisan &rarr;
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
