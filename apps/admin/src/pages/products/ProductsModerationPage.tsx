import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Search,
  CheckCircle,
  XCircle,
  Eye,
  Store,
  Layers,
  Sparkles,
  Tag,
  Clock,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card, CardBody } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Textarea } from '../../components/common/Textarea';

interface ProductAdminItem {
  _id: string;
  title: string;
  slug: string;
  sku?: string;
  description: string;
  price: number;
  stock: number;
  fulfilmentType: 'ready_stock' | 'made_to_order';
  productionDays?: number;
  leadTimeDays?: number;
  isCustomisable?: boolean;
  customisationAvailable?: boolean;
  materials?: string[];
  dimensions?: {
    l: number;
    w: number;
    h: number;
    unit: string;
  };
  weightGrams?: number;
  hsnCode?: string;
  gstRate?: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  images: Array<{ url: string; alt?: string }>;
  sellerId?: {
    _id: string;
    shopName: string;
    slug: string;
    legalName?: string;
  };
  categoryId?: {
    _id: string;
    name: string;
    slug: string;
  };
  createdAt: string;
}

export const ProductsModerationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const currentTab = searchParams.get('tab') || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductAdminItem | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data, isLoading } = useQuery<{ products: ProductAdminItem[] }>({
    queryKey: ['admin-products', currentTab, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentTab !== 'all') params.append('status', currentTab);
      if (searchQuery) params.append('search', searchQuery);
      const res = await api.get<{ products: ProductAdminItem[] }>(`/products/admin/list?${params.toString()}`);
      return res || { products: [] };
    },
  });

  const products = data?.products || [];

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, rejectionReason }: { id: string; status: string; rejectionReason?: string }) => {
      return await api.patch(`/products/admin/${id}/status`, { status, rejectionReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setSelectedProduct(null);
      setIsRejectModalOpen(false);
      setRejectionReason('');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="emerald">Approved &bull; Live</Badge>;
      case 'pending':
        return <Badge variant="amber">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="rose">Rejected</Badge>;
      case 'draft':
      default:
        return <Badge variant="slate">Draft</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Product Catalog Moderation
          </h1>
          <p className="text-xs text-admin-400 mt-1">
            Audit craft authenticity, photo standards, HSN codes, and statutory GST rates.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <input
            type="text"
            placeholder="Search creation title or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-admin-900 border border-admin-700 rounded-xl text-xs text-white placeholder:text-admin-500 focus:outline-none focus:border-terracotta-500"
          />
          <Search className="w-4 h-4 text-admin-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-admin-800 pb-2 overflow-x-auto no-scrollbar">
        {['all', 'pending', 'approved', 'rejected', 'draft'].map((tab) => (
          <button
            key={tab}
            onClick={() => setSearchParams({ tab })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              currentTab === tab
                ? 'bg-terracotta-600 text-white shadow-admin-sm'
                : 'text-admin-400 hover:text-white hover:bg-admin-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Products Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-admin-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 p-8 space-y-2">
              <Package className="w-10 h-10 text-admin-600 mx-auto" />
              <h3 className="font-bold text-sm text-admin-300">No Products in Queue</h3>
              <p className="text-xs text-admin-500">No craft submissions match the current status filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-950/60 border-b border-admin-800 text-admin-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Creation & Photo</th>
                    <th className="px-6 py-4">Artisan Studio</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Price (Paise)</th>
                    <th className="px-6 py-4">Fulfilment</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-800 text-admin-200">
                  {products.map((p) => (
                    <tr key={p._id} className="hover:bg-admin-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.images?.[0]?.url || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=120&q=80'}
                            alt={p.title}
                            className="w-12 h-12 rounded-xl object-cover border border-admin-700 shrink-0 bg-admin-950"
                          />
                          <div>
                            <div className="font-bold text-white text-sm line-clamp-1">{p.title}</div>
                            <div className="text-admin-400 text-[11px]">{p.sku ? `SKU: ${p.sku}` : `Stock: ${p.stock}`}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-admin-200">{p.sellerId?.shopName || 'Studio'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-admin-300">{p.categoryId?.name || 'Handmade'}</span>
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {formatINR(p.price)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] text-admin-400">
                          {p.fulfilmentType === 'ready_stock' ? 'Ready Stock' : 'Made to Order'}
                        </span>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedProduct(p)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      {/* INSPECTION & MODERATION MODAL */}
      <Modal
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        title={selectedProduct ? `Product Audit: ${selectedProduct.title}` : ''}
        maxWidth="3xl"
      >
        {selectedProduct && (
          <div className="space-y-6 text-xs text-admin-200">
            {/* Gallery Previews */}
            <div className="space-y-2">
              <span className="text-admin-400 uppercase font-bold text-[11px]">Craft Photography</span>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                {selectedProduct.images?.map((img, i) => (
                  <img
                    key={i}
                    src={img.url}
                    alt=""
                    className="w-24 h-24 rounded-xl object-cover border border-admin-700 shrink-0"
                  />
                ))}
              </div>
            </div>

            {/* Core Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-1">
                <span className="text-admin-500 text-[11px] uppercase font-bold">Artisan Studio</span>
                <p className="text-white font-bold text-sm">{selectedProduct.sellerId?.shopName}</p>
                <p className="text-admin-400">Category: {selectedProduct.categoryId?.name}</p>
              </div>

              <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-1">
                <span className="text-admin-500 text-[11px] uppercase font-bold">Pricing & Stock</span>
                <p className="text-emerald-400 font-bold text-sm">
                  {formatINR(selectedProduct.price)} (GST {selectedProduct.gstRate ?? 12}% Included)
                </p>
                <p className="text-admin-400">
                  Stock Units: {selectedProduct.stock} &bull; HSN Code: {selectedProduct.hsnCode || '6912'}
                </p>
              </div>
            </div>

            {/* Description & Materials */}
            <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-2">
              <span className="text-admin-500 text-[11px] uppercase font-bold">Artisan Description</span>
              <p className="text-admin-100 whitespace-pre-line leading-relaxed">
                {selectedProduct.description}
              </p>
              {selectedProduct.materials && selectedProduct.materials.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {selectedProduct.materials.map((m, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-admin-800 text-admin-300 text-[10px] font-semibold"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Rejection Note If Previously Rejected */}
            {selectedProduct.rejectionReason && (
              <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/60 space-y-1">
                <span className="text-red-400 text-[11px] uppercase font-bold">Rejection Audit Log Note</span>
                <p className="text-red-200">{selectedProduct.rejectionReason}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-admin-800">
              <div className="flex items-center gap-2">
                <span className="text-admin-400 text-xs font-medium">Status:</span>
                {getStatusBadge(selectedProduct.status)}
              </div>

              <div className="flex items-center gap-2">
                {selectedProduct.status !== 'approved' && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => statusMutation.mutate({ id: selectedProduct._id, status: 'approved' })}
                    isLoading={statusMutation.isPending}
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                  >
                    Approve & Publish
                  </Button>
                )}

                {selectedProduct.status !== 'rejected' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsRejectModalOpen(true)}
                    isLoading={statusMutation.isPending}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Reject Submission
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* REJECT CONFIRMATION MODAL */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reject Product Submission"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-admin-200">
          <p className="text-admin-300">
            Please enter moderation feedback explaining why <strong>{selectedProduct?.title}</strong> was rejected:
          </p>
          <Textarea
            label="Moderation Feedback"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Photo resolution is too low, or description lacks material provenance..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (selectedProduct) {
                  statusMutation.mutate({
                    id: selectedProduct._id,
                    status: 'rejected',
                    rejectionReason,
                  });
                }
              }}
              isLoading={statusMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
