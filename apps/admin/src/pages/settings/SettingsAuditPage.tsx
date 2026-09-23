import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sliders,
  Shield,
  Percent,
  Calendar,
  Save,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card, CardBody, CardHeader } from '../../components/common/Card';
import { Input } from '../../components/common/Input';

interface AuditLogItem {
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
}

export const SettingsAuditPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'settings' | 'audit'>('settings');
  const [auditPage, setAuditPage] = useState(1);

  // Settings Query
  const { data: settingsData, isLoading: isSettingsLoading } = useQuery<{
    settings: {
      platformCommissionRate: number;
      financialYear: string;
    };
  }>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      return await api.get('/admin/settings');
    },
  });

  const [commissionRate, setCommissionRate] = useState<string>('10');
  const [financialYear, setFinancialYear] = useState<string>('2026-27');
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (settingsData?.settings) {
      setCommissionRate(settingsData.settings.platformCommissionRate.toString());
      setFinancialYear(settingsData.settings.financialYear);
    }
  }, [settingsData]);

  // Settings Mutation
  const settingsMutation = useMutation({
    mutationFn: async () => {
      return await api.put('/admin/settings', {
        platformCommissionRate: parseFloat(commissionRate),
        financialYear,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  // Audit Logs Query
  const { data: auditData, isLoading: isAuditLoading } = useQuery<{
    logs: AuditLogItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ['admin-audit-logs', auditPage],
    queryFn: async () => {
      return await api.get(`/admin/audit-logs?page=${auditPage}&limit=20`);
    },
    enabled: activeTab === 'audit',
  });

  const logs = auditData?.logs || [];
  const pagination = auditData?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Platform Settings & System Audit Trail
          </h1>
          <p className="text-xs text-admin-400 mt-1">
            Configure platform commission fallbacks (Tier 3) and inspect the immutable administrative activity logs.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-admin-800">
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 px-2 text-sm font-display font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'settings'
              ? 'border-terracotta-500 text-terracotta-400'
              : 'border-transparent text-admin-400 hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Platform Settings</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 px-2 text-sm font-display font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'audit'
              ? 'border-terracotta-500 text-terracotta-400'
              : 'border-transparent text-admin-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Immutable Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader>
              <h3 className="font-display font-bold text-sm text-white">
                Platform Commission & Financial Year Configuration
              </h3>
            </CardHeader>
            <CardBody className="space-y-5">
              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Platform settings successfully updated and logged to audit trail.</span>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  label="Platform Default Commission Rate (Tier 3 Fallback %)"
                  type="number"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  helperText="Applied when neither an artisan override nor a category default rate exists."
                  leftIcon={<Percent className="w-4 h-4 text-terracotta-400" />}
                />

                <Input
                  label="Active Statutory Financial Year"
                  required
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  helperText="Used in generating official sequential invoice numbers (e.g. KP/2026-27/000001)."
                  leftIcon={<Calendar className="w-4 h-4 text-terracotta-400" />}
                />
              </div>

              <div className="pt-4 border-t border-admin-800 flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => settingsMutation.mutate()}
                  isLoading={settingsMutation.isPending}
                  leftIcon={<Save className="w-4 h-4" />}
                >
                  Save Platform Settings
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* TAB 2: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <Card>
          <CardBody className="p-0">
            {isAuditLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-admin-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-16 p-8 space-y-2">
                <Shield className="w-10 h-10 text-admin-600 mx-auto" />
                <h3 className="font-bold text-sm text-admin-300">No Audit Logs</h3>
                <p className="text-xs text-admin-500">Administrative actions will be permanently recorded here.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-admin-950/60 border-b border-admin-800 text-admin-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Actor</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Target Entity</th>
                        <th className="px-6 py-4">Metadata Payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-admin-800 text-admin-200">
                      {logs.map((log) => (
                        <tr key={log._id} className="hover:bg-admin-800/30 transition-colors">
                          <td className="px-6 py-4 text-admin-400 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-admin-500" />
                              <span>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-white">
                              {log.actorId?.name || log.actorId?.email || 'System'}
                            </div>
                            <div className="text-admin-400 text-[11px]">{log.actorId?.role || 'admin'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="terracotta" size="sm">
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-admin-300">
                            {log.targetModel} {log.targetId ? `(${log.targetId.slice(-6)})` : ''}
                          </td>
                          <td className="px-6 py-4 font-mono text-[11px] text-admin-400 max-w-xs truncate">
                            {log.metadata ? JSON.stringify(log.metadata) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-admin-800 text-xs">
                    <span className="text-admin-400">
                      Page {pagination.page} of {pagination.totalPages} ({pagination.total} total log entries)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pagination.page <= 1}
                        onClick={() => setAuditPage(pagination.page - 1)}
                        leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pagination.page >= pagination.totalPages}
                        onClick={() => setAuditPage(pagination.page + 1)}
                        rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
};
