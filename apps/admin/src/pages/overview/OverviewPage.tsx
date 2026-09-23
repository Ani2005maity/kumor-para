import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Percent,
  ShoppingBag,
  Users,
  Package,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
  FileText,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

interface OverviewData {
  kpis: {
    totalGrossGMV: number;
    totalCommissionEarned: number;
    totalArtisanPayouts: number;
    totalOrders: number;
    approvedSellersCount: number;
    pendingSellersCount: number;
    approvedProductsCount: number;
    pendingProductsCount: number;
  };
  recentActivity: Array<{
    _id: string;
    action: string;
    targetModel: string;
    targetId: string;
    timestamp: string;
    metadata?: any;
    actorId?: {
      name: string;
      email: string;
      role: string;
    };
  }>;
}

export const OverviewPage: React.FC = () => {
  const { data, isLoading } = useQuery<OverviewData>({
    queryKey: ['admin-overview'],
    queryFn: async () => {
      return await api.get('/admin/overview');
    },
    refetchInterval: 10000,
  });

  const kpis = data?.kpis || {
    totalGrossGMV: 0,
    totalCommissionEarned: 0,
    totalArtisanPayouts: 0,
    totalOrders: 0,
    approvedSellersCount: 0,
    pendingSellersCount: 0,
    approvedProductsCount: 0,
    pendingProductsCount: 0,
  };

  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Platform Overview & Analytics
          </h1>
          <p className="text-xs text-admin-400 mt-1">
            Real-time financial aggregates, moderation queues, and operational status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/invoices">
            <Button variant="secondary" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
              Invoice Register
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="outline" size="sm">
              Platform Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Moderation Alert Strip */}
      {(kpis.pendingSellersCount > 0 || kpis.pendingProductsCount > 0) && (
        <div className="p-5 rounded-3xl bg-amber-950/40 border border-amber-800/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="font-display font-bold text-sm text-amber-200">
                Action Required: Pending Moderation Queues
              </h4>
              <p className="text-xs text-amber-300/80">
                {kpis.pendingSellersCount} artisan {kpis.pendingSellersCount === 1 ? 'application' : 'applications'} and{' '}
                {kpis.pendingProductsCount} product {kpis.pendingProductsCount === 1 ? 'submission' : 'submissions'} awaiting review.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {kpis.pendingSellersCount > 0 && (
              <Link to="/sellers?tab=pending" className="w-full md:w-auto">
                <Button size="sm" variant="primary" className="w-full">
                  Review Artisans ({kpis.pendingSellersCount})
                </Button>
              </Link>
            )}
            {kpis.pendingProductsCount > 0 && (
              <Link to="/products?tab=pending" className="w-full md:w-auto">
                <Button size="sm" variant="secondary" className="w-full">
                  Review Products ({kpis.pendingProductsCount})
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 4 Primary Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Gross GMV */}
        <Card>
          <CardBody className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-admin-400">Total Gross GMV</span>
              <div className="p-2 rounded-xl bg-terracotta-900/50 text-terracotta-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display font-black text-2xl text-white">
              {isLoading ? '...' : formatINR(kpis.totalGrossGMV)}
            </div>
            <p className="text-[11px] text-admin-400">Gross transaction volume</p>
          </CardBody>
        </Card>

        {/* Platform Commission Earned */}
        <Card>
          <CardBody className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-admin-400">Commission Revenue</span>
              <div className="p-2 rounded-xl bg-emerald-950/60 text-emerald-400">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display font-black text-2xl text-emerald-400">
              {isLoading ? '...' : formatINR(kpis.totalCommissionEarned)}
            </div>
            <p className="text-[11px] text-admin-400">Net platform revenue generated</p>
          </CardBody>
        </Card>

        {/* Net Artisan Payouts */}
        <Card>
          <CardBody className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-admin-400">Artisan Payouts</span>
              <div className="p-2 rounded-xl bg-blue-950/60 text-blue-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display font-black text-2xl text-white">
              {isLoading ? '...' : formatINR(kpis.totalArtisanPayouts)}
            </div>
            <p className="text-[11px] text-admin-400">Disbursed to creators</p>
          </CardBody>
        </Card>

        {/* Total Orders */}
        <Card>
          <CardBody className="p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-admin-400">Total Orders</span>
              <div className="p-2 rounded-xl bg-purple-950/60 text-purple-400">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display font-black text-2xl text-white">
              {isLoading ? '...' : kpis.totalOrders}
            </div>
            <p className="text-[11px] text-admin-400">Multi-vendor orders</p>
          </CardBody>
        </Card>
      </div>

      {/* Operational Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Artisans & Catalog Summary */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-white">Ecosystem Capacity</h3>
          </CardHeader>
          <CardBody className="p-6 space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-admin-950/60 border border-admin-800">
              <div className="flex items-center gap-2.5">
                <Users className="w-4 h-4 text-terracotta-400" />
                <span className="text-xs font-medium text-admin-200">Active Artisan Studios</span>
              </div>
              <span className="font-bold text-sm text-white">{kpis.approvedSellersCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-admin-950/60 border border-admin-800">
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-admin-200">Live Active Products</span>
              </div>
              <span className="font-bold text-sm text-white">{kpis.approvedProductsCount}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-admin-950/60 border border-admin-800">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-admin-200">Pending Seller Approvals</span>
              </div>
              <Badge variant="amber">{kpis.pendingSellersCount}</Badge>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-admin-950/60 border border-admin-800">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-admin-200">Pending Product Reviews</span>
              </div>
              <Badge variant="amber">{kpis.pendingProductsCount}</Badge>
            </div>
          </CardBody>
        </Card>

        {/* Recent Audit Log Stream */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <h3 className="font-display font-bold text-sm text-white">Recent System Audit Trail</h3>
            <Link to="/settings" className="text-xs text-terracotta-400 hover:underline">
              View All Logs &rarr;
            </Link>
          </CardHeader>
          <CardBody className="p-0">
            {recentActivity.length === 0 ? (
              <div className="p-8 text-center text-xs text-admin-500">
                No recent activity logged.
              </div>
            ) : (
              <div className="divide-y divide-admin-800 text-xs">
                {recentActivity.map((log) => (
                  <div key={log._id} className="p-4 flex items-center justify-between gap-4 hover:bg-admin-800/30 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-admin-100">{log.action}</span>
                        <Badge variant="slate" size="sm">{log.targetModel}</Badge>
                      </div>
                      <p className="text-[11px] text-admin-400">
                        By {log.actorId?.name || log.actorId?.email || 'System'} ({log.actorId?.role || 'Admin'})
                      </p>
                    </div>
                    <span className="text-[11px] text-admin-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
