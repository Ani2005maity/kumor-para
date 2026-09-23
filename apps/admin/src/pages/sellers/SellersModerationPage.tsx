import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Percent,
  MapPin,
  Building,
  CreditCard,
  FileCheck,
  Eye,
  Sliders,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card, CardBody } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { Textarea } from '../../components/common/Textarea';

interface SellerAdminItem {
  _id: string;
  shopName: string;
  slug: string;
  legalName?: string;
  location?: string;
  city?: string;
  state?: string;
  pincode?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  commissionRate?: number; // custom override in %
  gstin?: string;
  pan?: string;
  phone?: string;
  bio?: string;
  bankAccount?: {
    accountHolderName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  };
  pickupAddress?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  userId?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export const SellersModerationPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const currentTab = searchParams.get('tab') || 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeller, setSelectedSeller] = useState<SellerAdminItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [customCommission, setCustomCommission] = useState<string>('');

  const { data, isLoading, refetch } = useQuery<{ sellers: SellerAdminItem[] }>({
    queryKey: ['admin-sellers', currentTab, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentTab !== 'all') params.append('status', currentTab);
      if (searchQuery) params.append('search', searchQuery);
      const res = await api.get<{ sellers: SellerAdminItem[] }>(`/sellers/admin/list?${params.toString()}`);
      return res || { sellers: [] };
    },
  });

  const sellers = data?.sellers || [];

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      return await api.patch(`/sellers/admin/${id}/status`, { status, reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      setSelectedSeller(null);
      setIsRejectModalOpen(false);
      setRejectionReason('');
    },
  });

  // Commission Mutation
  const commissionMutation = useMutation({
    mutationFn: async ({ id, rate }: { id: string; rate: number }) => {
      return await api.patch(`/sellers/admin/${id}/commission`, { commissionRate: rate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-sellers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      if (selectedSeller) {
        setSelectedSeller((prev) => prev ? { ...prev, commissionRate: parseFloat(customCommission) } : null);
      }
    },
  });

  const openInspectModal = (seller: SellerAdminItem) => {
    setSelectedSeller(seller);
    setCustomCommission(seller.commissionRate !== undefined ? seller.commissionRate.toString() : '');
  };

  const handleUpdateCommission = () => {
    if (!selectedSeller) return;
    const rate = parseFloat(customCommission);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      alert('Please enter a valid commission percentage between 0 and 100');
      return;
    }
    commissionMutation.mutate({ id: selectedSeller._id, rate });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="emerald">Approved &bull; Live</Badge>;
      case 'pending':
        return <Badge variant="amber">Pending Review</Badge>;
      case 'rejected':
        return <Badge variant="rose">Rejected</Badge>;
      case 'suspended':
        return <Badge variant="slate">Suspended</Badge>;
      default:
        return <Badge variant="slate">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Artisan & Studio Moderation
          </h1>
          <p className="text-xs text-admin-400 mt-1">
            Review onboarding applications, verify workshop credentials, and set custom commission tiers.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[260px]">
          <input
            type="text"
            placeholder="Search studio name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-admin-900 border border-admin-700 rounded-xl text-xs text-white placeholder:text-admin-500 focus:outline-none focus:border-terracotta-500"
          />
          <Search className="w-4 h-4 text-admin-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-admin-800 pb-2 overflow-x-auto no-scrollbar">
        {['all', 'pending', 'approved', 'rejected', 'suspended'].map((tab) => (
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

      {/* Sellers List Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-admin-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : sellers.length === 0 ? (
            <div className="text-center py-16 p-8 space-y-2">
              <Users className="w-10 h-10 text-admin-600 mx-auto" />
              <h3 className="font-bold text-sm text-admin-300">No Artisans Found</h3>
              <p className="text-xs text-admin-500">No creators match the current filter or search criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-950/60 border-b border-admin-800 text-admin-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Studio / Legal Name</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Tax / GSTIN</th>
                    <th className="px-6 py-4">Commission</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-800 text-admin-200">
                  {sellers.map((s) => (
                    <tr key={s._id} className="hover:bg-admin-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-white text-sm">{s.shopName}</div>
                        <div className="text-admin-400 text-[11px]">{s.legalName || 'Individual Artisan'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{s.userId?.email || 'N/A'}</div>
                        <div className="text-admin-400 text-[11px]">{s.phone || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-admin-300">
                          <MapPin className="w-3.5 h-3.5 text-terracotta-400" />
                          <span>{s.location || `${s.city || ''}, ${s.state || ''}`}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {s.gstin ? (
                          <span className="font-mono text-[11px] text-emerald-400">{s.gstin}</span>
                        ) : (
                          <span className="text-admin-500 text-[11px]">Non-GST (Bill of Supply)</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {s.commissionRate !== undefined ? (
                          <span className="font-bold text-terracotta-400">{s.commissionRate}% (Override)</span>
                        ) : (
                          <span className="text-admin-500">Category Default</span>
                        )}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(s.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openInspectModal(s)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Inspect & Moderate
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

      {/* DETAILED SELLER INSPECTION MODAL */}
      <Modal
        isOpen={!!selectedSeller}
        onClose={() => setSelectedSeller(null)}
        title={selectedSeller ? `Studio Inspection: ${selectedSeller.shopName}` : ''}
        maxWidth="2xl"
      >
        {selectedSeller && (
          <div className="space-y-6 text-xs text-admin-200">
            {/* Top Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-1">
                <span className="text-admin-500 text-[11px] uppercase font-bold">Studio Bio / Heritage</span>
                <p className="text-admin-100 italic leading-relaxed">
                  &ldquo;{selectedSeller.bio || 'Independent master creator dedicated to authentic craft.'}&rdquo;
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-1">
                <span className="text-admin-500 text-[11px] uppercase font-bold">Workshop Pickup Address</span>
                <p className="text-admin-100">
                  {selectedSeller.pickupAddress?.street || selectedSeller.location || 'Workshop on record'},{' '}
                  {selectedSeller.pickupAddress?.city || selectedSeller.city}, {selectedSeller.pickupAddress?.state || selectedSeller.state} -{' '}
                  {selectedSeller.pickupAddress?.pincode || selectedSeller.pincode}
                </p>
              </div>
            </div>

            {/* Bank & Tax Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-1">
                <span className="text-admin-500 text-[11px] uppercase font-bold flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-terracotta-400" />
                  Bank Account Payout Info
                </span>
                <p className="text-admin-100 font-bold">{selectedSeller.bankAccount?.accountHolderName || selectedSeller.shopName}</p>
                <p className="text-admin-400">
                  A/C: {selectedSeller.bankAccount?.accountNumber || 'Verified via Bank'} &bull; IFSC:{' '}
                  {selectedSeller.bankAccount?.ifscCode || 'Verified'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-1">
                <span className="text-admin-500 text-[11px] uppercase font-bold flex items-center gap-1">
                  <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Statutory Tax Info
                </span>
                <p className="text-admin-100">
                  GSTIN: {selectedSeller.gstin || 'Unregistered (Bill of Supply)'}
                </p>
                <p className="text-admin-400">PAN: {selectedSeller.pan || 'On Record'}</p>
              </div>
            </div>

            {/* Custom Commission Override Form */}
            <div className="p-4 rounded-2xl bg-admin-950 border border-admin-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-terracotta-400" />
                  Tier-1 Artisan Custom Commission Rate
                </span>
                <span className="text-admin-500 text-[11px]">Overrides category & platform default</span>
              </div>

              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  placeholder="e.g. 8 (for 8%)"
                  value={customCommission}
                  onChange={(e) => setCustomCommission(e.target.value)}
                  className="max-w-[180px]"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleUpdateCommission}
                  isLoading={commissionMutation.isPending}
                >
                  Save Commission Rate
                </Button>
              </div>
            </div>

            {/* Moderation Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-admin-800">
              <div className="flex items-center gap-2">
                <span className="text-admin-400 text-xs font-medium">Current Status:</span>
                {getStatusBadge(selectedSeller.status)}
              </div>

              <div className="flex items-center gap-2">
                {selectedSeller.status !== 'approved' && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => statusMutation.mutate({ id: selectedSeller._id, status: 'approved' })}
                    isLoading={statusMutation.isPending}
                    leftIcon={<CheckCircle className="w-4 h-4" />}
                  >
                    Approve Artisan
                  </Button>
                )}

                {selectedSeller.status !== 'rejected' && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setIsRejectModalOpen(true)}
                    isLoading={statusMutation.isPending}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Reject Application
                  </Button>
                )}

                {selectedSeller.status === 'approved' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => statusMutation.mutate({ id: selectedSeller._id, status: 'suspended', reason: 'Administrative suspension' })}
                    isLoading={statusMutation.isPending}
                  >
                    Suspend
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
        title="Reject Artisan Application"
        maxWidth="md"
      >
        <div className="space-y-4 text-xs text-admin-200">
          <p className="text-admin-300">
            Please provide an audit rationale for rejecting <strong>{selectedSeller?.shopName}</strong>:
          </p>
          <Textarea
            label="Rejection Feedback"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="e.g. Workshop pickup address could not be verified or missing craft provenance documentation..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setIsRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (selectedSeller) {
                  statusMutation.mutate({
                    id: selectedSeller._id,
                    status: 'rejected',
                    reason: rejectionReason,
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
