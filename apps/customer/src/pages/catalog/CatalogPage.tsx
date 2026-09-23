import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Filter,
  Search,
  SlidersHorizontal,
  X,
  Star,
  ShoppingBag,
  ArrowUpDown,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR, LAUNCH_CATEGORIES } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
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
    _id: string;
    name: string;
    slug: string;
  };
}

interface CatalogApiResponse {
  products: ProductItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addItem } = useCartStore();

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Parse query params
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('q') || '';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const fulfilmentParam = searchParams.get('fulfilmentType') || '';
  const sortByParam = searchParams.get('sortBy') || 'newest';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Local state for search bar inside catalog
  const [searchInput, setSearchInput] = useState(searchParam);

  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Fetch Catalog Query
  const { data, isLoading, isError, refetch } = useQuery<CatalogApiResponse>({
    queryKey: [
      'catalog',
      categoryParam,
      searchParam,
      minPriceParam,
      maxPriceParam,
      fulfilmentParam,
      sortByParam,
      pageParam,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryParam) params.append('category', categoryParam);
      if (searchParam) params.append('search', searchParam);
      if (minPriceParam) params.append('minPrice', minPriceParam);
      if (maxPriceParam) params.append('maxPrice', maxPriceParam);
      if (fulfilmentParam) params.append('fulfilmentType', fulfilmentParam);
      if (sortByParam) params.append('sortBy', sortByParam);
      params.append('page', pageParam.toString());
      params.append('limit', '12');

      const res = await api.get<CatalogApiResponse>(`/products?${params.toString()}`);
      return res || { products: [], pagination: { total: 0, page: 1, limit: 12, totalPages: 1 } };
    },
  });

  const products = data?.products || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 12, totalPages: 1 };

  const updateFilters = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    });
    // Reset to page 1 on filter changes
    if (!updates.page) {
      next.set('page', '1');
    }
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchInput.trim() || null });
  };

  const handleClearAll = () => {
    setSearchParams({});
    setSearchInput('');
  };

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
      image:
        p.images?.[0]?.url ||
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=600&q=80',
      price: p.price,
      stock: p.stock,
      fulfilmentType: p.fulfilmentType,
      productionDays: p.productionDays,
      qty: 1,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Breadcrumb & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-stone-warm-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-stone-warm-600 mb-1">
            <Link to="/" className="hover:text-terracotta-600 transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-charcoal-800 font-semibold">Catalog</span>
            {categoryParam && (
              <>
                <span>/</span>
                <span className="text-terracotta-700 font-bold">{categoryParam}</span>
              </>
            )}
          </div>
          <h1 className="font-display font-black text-3xl sm:text-4xl text-charcoal-900 tracking-tight">
            {categoryParam ? `${categoryParam} Creations` : searchParam ? `Results for &ldquo;${searchParam}&rdquo;` : 'All Handcrafted Creations'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-warm-600 mt-1">
            Showing {pagination.total} verified handmade creations from independent Indian studios
          </p>
        </div>

        {/* Top Controls: Search & Sort */}
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative min-w-[220px]">
            <input
              type="text"
              placeholder="Search in catalog..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-stone-warm-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/20"
            />
            <Search className="w-4 h-4 text-stone-warm-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </form>

          {/* Sort Dropdown */}
          <div className="relative inline-flex items-center">
            <select
              value={sortByParam}
              onChange={(e) => updateFilters({ sortBy: e.target.value })}
              className="appearance-none bg-white border border-stone-warm-300 rounded-xl px-4 py-2 pr-8 text-xs sm:text-sm font-medium text-charcoal-800 focus:outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-500/20 cursor-pointer shadow-warm-sm"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="popular">Most Popular</option>
            </select>
            <ArrowUpDown className="w-3.5 h-3.5 text-stone-warm-500 absolute right-3 pointer-events-none" />
          </div>

          {/* Mobile Filter Toggle Button */}
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileFilterOpen(true)}
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
          >
            Filters
          </Button>
        </div>
      </div>

      {/* Main Layout: Sidebar Filters + Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* DESKTOP FILTERS SIDEBAR */}
        <div className="hidden lg:block space-y-6 bg-white rounded-2xl border border-stone-warm-200/80 p-6 shadow-warm-sm sticky top-32">
          <div className="flex items-center justify-between pb-4 border-b border-stone-warm-100">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-terracotta-600" />
              <span className="font-display font-bold text-sm text-charcoal-900">Filters</span>
            </div>
            {(categoryParam || searchParam || minPriceParam || maxPriceParam || fulfilmentParam) && (
              <button
                onClick={handleClearAll}
                className="text-xs font-semibold text-terracotta-600 hover:text-terracotta-800"
              >
                Reset All
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">Categories</h4>
            <div className="space-y-1.5">
              <button
                onClick={() => updateFilters({ category: null })}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                  !categoryParam
                    ? 'bg-terracotta-50 text-terracotta-800 font-bold border border-terracotta-200'
                    : 'text-stone-warm-700 hover:bg-stone-warm-100'
                }`}
              >
                All Categories
              </button>
              {LAUNCH_CATEGORIES.map((cat) => (
                <button
                  key={cat.slug}
                  onClick={() => updateFilters({ category: cat.name })}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors flex items-center justify-between ${
                    categoryParam === cat.name
                      ? 'bg-terracotta-50 text-terracotta-800 font-bold border border-terracotta-200'
                      : 'text-stone-warm-700 hover:bg-stone-warm-100'
                  }`}
                >
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fulfilment Type Filter */}
          <div className="space-y-3 pt-4 border-t border-stone-warm-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
              Fulfilment Type
            </h4>
            <div className="space-y-1.5">
              <button
                onClick={() => updateFilters({ fulfilmentType: null })}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium ${
                  !fulfilmentParam
                    ? 'bg-stone-warm-200 text-charcoal-900 font-bold'
                    : 'text-stone-warm-600 hover:bg-stone-warm-100'
                }`}
              >
                All Types
              </button>
              <button
                onClick={() => updateFilters({ fulfilmentType: 'ready_stock' })}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium ${
                  fulfilmentParam === 'ready_stock'
                    ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                    : 'text-stone-warm-600 hover:bg-stone-warm-100'
                }`}
              >
                Ready Stock (Ships 24-48h)
              </button>
              <button
                onClick={() => updateFilters({ fulfilmentType: 'made_to_order' })}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium ${
                  fulfilmentParam === 'made_to_order'
                    ? 'bg-ochre-50 text-ochre-800 font-bold border border-ochre-200'
                    : 'text-stone-warm-600 hover:bg-stone-warm-100'
                }`}
              >
                Made to Order (Hand-Crafted)
              </button>
            </div>
          </div>

          {/* Price Range Presets */}
          <div className="space-y-3 pt-4 border-t border-stone-warm-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
              Price Range
            </h4>
            <div className="space-y-1.5">
              <button
                onClick={() => updateFilters({ minPrice: null, maxPrice: null })}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium ${
                  !minPriceParam && !maxPriceParam
                    ? 'bg-stone-warm-200 text-charcoal-900 font-bold'
                    : 'text-stone-warm-600 hover:bg-stone-warm-100'
                }`}
              >
                Any Price
              </button>
              <button
                onClick={() => updateFilters({ minPrice: '0', maxPrice: '50000' })}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium ${
                  minPriceParam === '0' && maxPriceParam === '50000'
                    ? 'bg-terracotta-50 text-terracotta-800 font-bold'
                    : 'text-stone-warm-600 hover:bg-stone-warm-100'
                }`}
              >
                Under ₹500
              </button>
              <button
                onClick={() => updateFilters({ minPrice: '50000', maxPrice: '150000' })}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium ${
                  minPriceParam === '50000' && maxPriceParam === '150000'
                    ? 'bg-terracotta-50 text-terracotta-800 font-bold'
                    : 'text-stone-warm-600 hover:bg-stone-warm-100'
                }`}
              >
                ₹500 — ₹1,500
              </button>
              <button
                onClick={() => updateFilters({ minPrice: '150000', maxPrice: '500000' })}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium ${
                  minPriceParam === '150000' && maxPriceParam === '500000'
                    ? 'bg-terracotta-50 text-terracotta-800 font-bold'
                    : 'text-stone-warm-600 hover:bg-stone-warm-100'
                }`}
              >
                ₹1,500 — ₹5,000
              </button>
              <button
                onClick={() => updateFilters({ minPrice: '500000', maxPrice: null })}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium ${
                  minPriceParam === '500000' && !maxPriceParam
                    ? 'bg-terracotta-50 text-terracotta-800 font-bold'
                    : 'text-stone-warm-600 hover:bg-stone-warm-100'
                }`}
              >
                Above ₹5,000
              </button>
            </div>
          </div>
        </div>

        {/* PRODUCTS GRID */}
        <div className="lg:col-span-3 space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 bg-stone-warm-200/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-stone-warm-200 p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-charcoal-900">Failed to load creations</h3>
              <p className="text-xs text-stone-warm-600">Please check your connection and try again.</p>
              <Button size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-stone-warm-200 p-8 space-y-4 shadow-warm-sm">
              <div className="w-16 h-16 rounded-3xl bg-stone-warm-100 flex items-center justify-center text-stone-warm-500 mx-auto">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-display font-bold text-charcoal-900">
                  No handcrafted creations found
                </h3>
                <p className="text-xs text-stone-warm-600 max-w-sm mx-auto">
                  Try adjusting your filters, clearing your search query, or checking back soon.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleClearAll}>
                Clear All Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
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

              {/* Pagination Bar */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8 border-t border-stone-warm-200">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => updateFilters({ page: (pagination.page - 1).toString() })}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-semibold text-charcoal-700 px-3">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => updateFilters({ page: (pagination.page + 1).toString() })}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* MOBILE FILTER MODAL / DRAWER */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-charcoal-900/60 backdrop-blur-sm"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="relative ml-auto w-full max-w-xs bg-white h-full shadow-2xl p-6 overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-warm-200">
              <h3 className="font-display font-bold text-base text-charcoal-900">Filters</h3>
              <button onClick={() => setMobileFilterOpen(false)} className="p-1.5 text-stone-warm-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Mobile */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-charcoal-700">Categories</h4>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    updateFilters({ category: null });
                    setMobileFilterOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium"
                >
                  All Categories
                </button>
                {LAUNCH_CATEGORIES.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => {
                      updateFilters({ category: cat.name });
                      setMobileFilterOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-medium"
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={() => setMobileFilterOpen(false)}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
