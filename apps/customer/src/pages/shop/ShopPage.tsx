import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin,
  Star,
  Award,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { useCartStore } from '../../store/useCartStore';

interface SellerProfile {
  _id: string;
  shopName: string;
  slug: string;
  legalName?: string;
  location?: string;
  city?: string;
  state?: string;
  bio?: string;
  rating?: number;
  totalSales?: number;
  bannerUrl?: string;
  logoUrl?: string;
  status: string;
}

interface ProductItem {
  _id: string;
  title: string;
  slug: string;
  price: number;
  stock: number;
  fulfilmentType: 'ready_stock' | 'made_to_order';
  productionDays?: number;
  images: Array<{ url: string }>;
  rating?: number;
  reviewCount?: number;
}

export const ShopPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { addItem } = useCartStore();

  const { data: seller, isLoading: isSellerLoading } = useQuery<SellerProfile>({
    queryKey: ['seller-profile', slug],
    queryFn: async () => {
      const res = await api.get<{ seller: SellerProfile }>(`/sellers/${slug}`);
      return res.seller;
    },
    enabled: !!slug,
  });

  const { data: productsData, isLoading: isProductsLoading } = useQuery<{
    products: ProductItem[];
  }>({
    queryKey: ['seller-products', slug],
    queryFn: async () => {
      const res = await api.get<{ products: ProductItem[] }>(`/products?seller=${slug}`);
      return res || { products: [] };
    },
    enabled: !!slug,
  });

  const products = productsData?.products || [];

  const handleQuickAdd = (p: ProductItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: p._id,
      sellerId: seller?._id || 'artisan',
      shopName: seller?.shopName || 'Artisan Studio',
      shopSlug: seller?.slug,
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

  if (isSellerLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-64 bg-stone-warm-200 rounded-3xl animate-pulse" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-terracotta-50 border border-terracotta-200 flex items-center justify-center text-terracotta-600 mx-auto">
          <Store className="w-8 h-8" />
        </div>
        <h2 className="font-display font-bold text-2xl text-charcoal-900">Artisan Studio Not Found</h2>
        <p className="text-sm text-stone-warm-600">This creator studio does not exist or may be inactive.</p>
        <Link to="/catalog">
          <Button size="md">Explore All Creators</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-20">
      {/* Studio Banner / Profile Hero */}
      <section className="bg-stone-warm-900 text-white pt-12 pb-16 border-b border-stone-warm-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 justify-between">
            <div className="flex items-start sm:items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-terracotta-600 text-white flex items-center justify-center shadow-warm-xl border-2 border-stone-warm-700 shrink-0">
                <Store className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display font-black text-2xl sm:text-3xl lg:text-4xl text-white">
                    {seller.shopName}
                  </h1>
                  <Badge variant="terracotta" size="sm">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Creator
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-stone-warm-300">
                  {seller.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-terracotta-400" />
                      {seller.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-ochre-400 text-ochre-400" />
                    <span className="font-bold text-white">{seller.rating ? seller.rating.toFixed(1) : '4.9'}</span>
                    <span>Studio Rating</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-stone-warm-800/80 p-4 rounded-2xl border border-stone-warm-700 text-xs text-stone-warm-300 max-w-sm">
              <p className="italic leading-relaxed">
                &ldquo;{seller.bio || 'Independent Indian master creator crafting authentic handmade artifacts with living heritage.'}&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Studio Creations Catalog */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-warm-200">
          <div>
            <h2 className="font-display font-black text-2xl text-charcoal-900">
              Creations by {seller.shopName}
            </h2>
            <p className="text-xs text-stone-warm-600 mt-0.5">
              {products.length} {products.length === 1 ? 'handcrafted piece' : 'handcrafted pieces'} listed in studio
            </p>
          </div>
        </div>

        {isProductsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-stone-warm-200/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-warm-200 p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-stone-warm-100 flex items-center justify-center text-stone-warm-500 mx-auto">
              <Store className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-charcoal-900">Studio items arriving soon</h3>
            <p className="text-xs text-stone-warm-600">The artisan is currently preparing new creations in their workshop.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                      <Link
                        to={`/product/${product.slug || product._id}`}
                        className="block font-display font-bold text-sm text-charcoal-900 hover:text-terracotta-600 transition-colors line-clamp-2 leading-snug"
                      >
                        {product.title}
                      </Link>

                      <div className="flex items-center gap-1 text-xs text-stone-warm-600">
                        <Star className="w-3.5 h-3.5 fill-ochre-400 text-ochre-400" />
                        <span className="font-bold text-charcoal-800">
                          {product.rating ? product.rating.toFixed(1) : '4.9'}
                        </span>
                        <span className="text-stone-warm-500">({product.reviewCount || 8})</span>
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
    </div>
  );
};
