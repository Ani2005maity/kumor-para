import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { formatINR, cn } from '../../lib/utils';
import {
  ReceiptText,
  IndianRupee,
  FileCheck,
  Download,
  Printer,
  Calendar,
  Search,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const InvoicesPage: React.FC = () => {
  const [activeType, setActiveType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Seller Invoices
  const { data, isLoading } = useQuery({
    queryKey: ['seller-invoices'],
    queryFn: () => api.get<{ invoices: any[] }>('/invoices/seller/my-invoices'),
  });

  const invoices = data?.invoices || [];

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (activeType !== 'all' && inv.type !== activeType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNumber = inv.invoiceNumber?.toLowerCase().includes(q);
      const matchBuyer = inv.buyerSnapshot?.name?.toLowerCase().includes(q);
      return matchNumber || matchBuyer;
    }
    return true;
  });

  // Aggregated Stats
  const totalSalesPaise = invoices
    .filter((inv) => inv.type === 'sale' && !inv.isCancelled)
    .reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);

  const totalTaxPaise = invoices
    .filter((inv) => inv.type === 'sale' && !inv.isCancelled)
    .reduce((sum, inv) => sum + (inv.taxTotal || 0), 0);

  const salesInvoicesCount = invoices.filter((i) => i.type === 'sale').length;
  const commissionInvoicesCount = invoices.filter((i) => i.type === 'commission').length;
  const creditNotesCount = invoices.filter((i) => i.type === 'credit_note').length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-display font-extrabold text-charcoal-900">
          Invoices & Financial Statements
        </h2>
        <p className="text-xs sm:text-sm text-stone-warm-600">
          Statutory GST Tax Invoices, Bills of Supply, and Platform Commission Statements
        </p>
      </div>

      {/* High Level Financial Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="hover:border-terracotta-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-warm-600 uppercase tracking-wider">
                Total Invoiced GMV
              </span>
              <div className="w-10 h-10 rounded-2xl bg-terracotta-50 text-terracotta-600 flex items-center justify-center">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-extrabold text-charcoal-900">
                {formatINR(totalSalesPaise)}
              </h3>
              <p className="mt-1 text-xs text-stone-warm-500">
                {salesInvoicesCount} sales invoice(s) generated
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-emerald-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-warm-600 uppercase tracking-wider">
                Total Tax Collected
              </span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-extrabold text-charcoal-900">
                {formatINR(totalTaxPaise)}
              </h3>
              <p className="mt-1 text-xs text-stone-warm-500">
                GST / Non-GST breakdown on orders
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-purple-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-stone-warm-600 uppercase tracking-wider">
                Commission Statements
              </span>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ReceiptText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-2xl font-display font-extrabold text-charcoal-900">
                {commissionInvoicesCount} Statements
              </h3>
              <p className="mt-1 text-xs text-stone-warm-500">
                Kumor Para intermediary fee invoices
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: 'all', label: 'All Documents', count: invoices.length },
              { key: 'sale', label: 'Customer Invoices', count: salesInvoicesCount },
              {
                key: 'commission',
                label: 'Commission Invoices',
                count: commissionInvoicesCount,
              },
              { key: 'credit_note', label: 'Credit Notes', count: creditNotesCount },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2',
                  activeType === tab.key
                    ? 'bg-charcoal-900 text-white shadow-warm-sm'
                    : 'bg-white text-charcoal-700 hover:bg-stone-warm-200/80 border border-stone-warm-200'
                )}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-md text-[10px] font-bold',
                      activeType === tab.key
                        ? 'bg-charcoal-700 text-white'
                        : 'bg-stone-warm-200 text-stone-warm-800'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="bg-white px-3 py-2 rounded-xl border border-stone-warm-200 shadow-warm-sm flex items-center gap-2 min-w-[240px]">
            <Search className="w-4 h-4 text-stone-warm-400" />
            <input
              type="text"
              placeholder="Search invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs sm:text-sm text-charcoal-900 placeholder:text-stone-warm-400 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Invoices Table */}
        {isLoading ? (
          <div className="p-16 text-center text-stone-warm-500 bg-white rounded-3xl border border-stone-warm-200">
            Loading invoices register...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-stone-warm-100 text-stone-warm-500 mx-auto flex items-center justify-center">
              <ReceiptText className="w-7 h-7 text-stone-warm-400" />
            </div>
            <h4 className="font-bold text-charcoal-900">No invoices match your selection</h4>
            <p className="text-xs text-stone-warm-600 max-w-sm mx-auto">
              Invoices are automatically issued whenever a patron completes checkout for your creations.
            </p>
          </Card>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-warm-200/90 shadow-warm-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-warm-200/80 bg-stone-warm-50/60 text-stone-warm-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="p-4 pl-6">Invoice Number</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Date Issued</th>
                    <th className="p-4">Place of Supply</th>
                    <th className="p-4">Taxable Value</th>
                    <th className="p-4">Tax Total</th>
                    <th className="p-4">Grand Total</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-warm-100 text-xs text-charcoal-900">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv._id}
                      className="hover:bg-stone-warm-50/50 transition-colors"
                    >
                      <td className="p-4 pl-6 font-mono font-bold text-charcoal-900">
                        {inv.invoiceNumber}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={
                            inv.type === 'commission'
                              ? 'purple'
                              : inv.type === 'credit_note'
                              ? 'warning'
                              : 'terracotta'
                          }
                          size="sm"
                        >
                          {inv.type === 'sale'
                            ? 'Sales Invoice'
                            : inv.type === 'commission'
                            ? 'Commission Fee'
                            : 'Credit Note'}
                        </Badge>
                      </td>
                      <td className="p-4 text-stone-warm-600">
                        {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-4 font-mono text-stone-warm-600">
                        State: {inv.placeOfSupplyStateCode || '19'}
                      </td>
                      <td className="p-4 font-semibold">
                        {formatINR(inv.taxableTotal)}
                      </td>
                      <td className="p-4 text-stone-warm-600">
                        {formatINR(inv.taxTotal)}
                      </td>
                      <td className="p-4 font-display font-bold text-sm text-charcoal-900">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="p-4">
                        {inv.isCancelled ? (
                          <Badge variant="danger" size="sm">
                            Cancelled
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            Issued
                          </Badge>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <a
                          href={`/api/invoices/${inv._id}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-terracotta-50 text-terracotta-800 hover:bg-terracotta-100 font-bold text-xs transition-colors border border-terracotta-200"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View A4 PDF</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
