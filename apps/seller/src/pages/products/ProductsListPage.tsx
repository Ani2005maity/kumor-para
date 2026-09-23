import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { ProductModal } from './ProductModal';
import { useToast } from '../../components/common/Toast';
import { formatINR, cn } from '../../lib/utils';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Send,
  Eye,
  Package,
  Layers,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

export const ProductsListPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch Seller's Products
  const { data, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => api.get<{ products: any[]; total: number }>('/products/seller/mine'),
  });

  const products = data?.products || [];

  // Filter products locally by status & search
  const filteredProducts = products.filter((product) => {
    if (statusFilter !== 'all' && product.status !== statusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = product.title?.toLowerCase().includes(q);
      const matchSku = product.sku?.toLowerCase().includes(q);
      const matchCategory =
        typeof product.categoryId === 'object' &&
        product.categoryId?.name?.toLowerCase().includes(q);
      return matchTitle || matchSku || matchCategory;
    }
    return true;
  });

  // Submit draft for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: async (productId: string) => {
      return api.patch(`/products/${productId}/submit`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Submitted for Review', 'Your creation has been submitted to Kumor Para curators.');
    },
    onError: (err: any) => {
      toast.error('Submission Failed', err.message);
    },
  });

  // Quick stock change mutation
  const stockMutation = useMutation({
    mutationFn: async ({ productId, newStock }: { productId: string; newStock: number }) => {
      return api.patch(`/products/${productId}/stock`, { stock: newStock });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
    },
    onError: (err: any) => {
      toast.error('Stock Update Failed', err.message);
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      return api.delete(`/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      toast.success('Creation Deleted', 'The product has been removed from your catalog.');
      setDeletingProductId(null);
    },
    onError: (err: any) => {
      toast.error('Delete Failed', err.message);
    },
  });

  const filterTabs = [
    { label: 'All Items', value: 'all', count: products.length },
    {
      label: 'Approved / Live',
      value: 'approved',
      count: products.filter((p) => p.status === 'approved').length,
    },
    {
      label: 'Under Review',
      value: 'pending',
      count: products.filter((p) => p.status === 'pending').length,
    },
    {
      label: 'Drafts',
      value: 'draft',
      count: products.filter((p) => p.status === 'draft').length,
    },
    {
      label: 'Rejected',
      value: 'rejected',
      count: products.filter((p) => p.status === 'rejected').length,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-charcoal-900">
            Handcrafted Catalog & Inventory
          </h2>
          <p className="text-xs sm:text-sm text-stone-warm-600">
            Manage your listings, update prices, and replenish available stock
          </p>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} size="md">
          <Plus className="w-4 h-4" />
          <span>Add New Creation</span>
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filterTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              'px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2',
              statusFilter === tab.value
                ? 'bg-charcoal-900 text-white shadow-warm-sm'
                : 'bg-white text-charcoal-700 hover:bg-stone-warm-200/80 border border-stone-warm-200'
            )}
          >
            <span>{tab.label}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                statusFilter === tab.value
                  ? 'bg-charcoal-700 text-white'
                  : 'bg-stone-warm-200 text-stone-warm-800'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-stone-warm-200/90 shadow-warm-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-stone-warm-400 pl-1" />
        <input
          type="text"
          placeholder="Search by product title, SKU, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm text-charcoal-900 placeholder:text-stone-warm-400 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs text-stone-warm-500 hover:text-charcoal-800 font-semibold px-2"
          >
            Clear
          </button>
        )}
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="p-16 text-center text-stone-warm-500 bg-white rounded-3xl border border-stone-warm-200">
          Loading catalog...
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-stone-warm-100 text-stone-warm-500 mx-auto flex items-center justify-center">
            <Package className="w-8 h-8 text-stone-warm-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-charcoal-900">No creations found</h3>
            <p className="text-xs sm:text-sm text-stone-warm-600 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters or search terms.'
                : 'Your studio does not have any items listed yet. Click below to add your first craft.'}
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} size="md">
            <Plus className="w-4 h-4" />
            <span>Add Creation</span>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((product) => {
            const coverImage =
              product.images?.[0]?.url ||
              'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=600';
            const categoryName =
              typeof product.categoryId === 'object'
                ? product.categoryId?.name
                : 'Handicraft';

            return (
              <div
                key={product._id}
                className="bg-white rounded-3xl border border-stone-warm-200/90 shadow-warm-sm hover:shadow-warm-md hover:border-terracotta-300 transition-all flex flex-col overflow-hidden group"
              >
                {/* Product Image & Badges */}
                <div className="relative aspect-4/3 bg-stone-warm-100 overflow-hidden">
                  <img
                    src={coverImage}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                    <Badge status={product.status} size="sm" dot />
                    {product.fulfilmentType === 'made_to_order' && (
                      <span className="px-2 py-0.5 rounded-full bg-charcoal-900/80 backdrop-blur-xs text-white text-[10px] font-bold">
                        Made to Order ({product.leadTimeDays || 3}d)
                      </span>
                    )}
                  </div>
                  {product.isCustomisable && (
                    <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-xs text-white text-[10px] font-bold">
                      Personalisation Available
                    </span>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-warm-500 font-mono">
                      <span>{categoryName}</span>
                      {product.sku && <span>SKU: {product.sku}</span>}
                    </div>
                    <h3 className="font-display font-bold text-base text-charcoal-900 line-clamp-1 group-hover:text-terracotta-600 transition-colors">
                      {product.title}
                    </h3>
                    <p className="text-xs text-stone-warm-600 line-clamp-2">
                      {product.description || 'Authentic handmade creation from Kumor Para.'}
                    </p>
                  </div>

                  {/* Materials tags */}
                  {product.materials && product.materials.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {product.materials.slice(0, 3).map((mat: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-stone-warm-100 text-stone-warm-700 text-[10px] font-medium"
                        >
                          {mat}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Pricing & Stock Controls */}
                  <div className="pt-3 border-t border-stone-warm-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-display font-extrabold text-charcoal-900">
                          {formatINR(product.price)}
                        </span>
                        {product.compareAtPrice && product.compareAtPrice > product.price && (
                          <span className="text-xs text-stone-warm-400 line-through">
                            {formatINR(product.compareAtPrice)}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-warm-500">
                        GST: {product.gstRate || 0}%
                      </span>
                    </div>

                    {/* Stock Quick Replenish */}
                    <div className="flex items-center gap-1.5 bg-stone-warm-100 p-1 rounded-xl">
                      <button
                        onClick={() =>
                          stockMutation.mutate({
                            productId: product._id,
                            newStock: Math.max(0, product.stock - 1),
                          })
                        }
                        disabled={product.stock <= 0}
                        className="w-6 h-6 rounded-lg bg-white text-charcoal-900 font-bold flex items-center justify-center hover:bg-stone-warm-200 disabled:opacity-40 transition-colors text-xs"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold font-mono px-1.5 min-w-[24px] text-center">
                        {product.stock}
                      </span>
                      <button
                        onClick={() =>
                          stockMutation.mutate({
                            productId: product._id,
                            newStock: product.stock + 1,
                          })
                        }
                        className="w-6 h-6 rounded-lg bg-white text-charcoal-900 font-bold flex items-center justify-center hover:bg-stone-warm-200 transition-colors text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingProduct(product)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </Button>

                      <button
                        onClick={() => setDeletingProductId(product._id)}
                        className="p-2 text-stone-warm-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Delete listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {product.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => submitForApprovalMutation.mutate(product._id)}
                        isLoading={submitForApprovalMutation.isPending}
                      >
                        <Send className="w-3 h-3" />
                        <span>Submit</span>
                      </Button>
                    )}

                    {product.status === 'rejected' && (
                      <div className="text-[11px] text-rose-700 font-medium">
                        {product.rejectionReason || 'Requires revision'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {(isAddModalOpen || editingProduct) && (
        <ProductModal
          isOpen={isAddModalOpen || Boolean(editingProduct)}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProductId && (
        <Modal
          isOpen={Boolean(deletingProductId)}
          onClose={() => setDeletingProductId(null)}
          title="Delete Handcrafted Listing"
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-stone-warm-700">
              Are you sure you want to deactivate and remove this product? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={() => setDeletingProductId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate(deletingProductId)}
                isLoading={deleteMutation.isPending}
              >
                Delete Creation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
