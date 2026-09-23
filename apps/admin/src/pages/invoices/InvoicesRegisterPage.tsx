import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Download,
  Eye,
  Search,
  CheckCircle,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import { api } from '../../lib/api';
import { formatINR } from '../../lib/utils';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card, CardBody } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';

interface InvoiceAdminItem {
  _id: string;
  invoiceNumber: string;
  type: 'sale' | 'commission' | 'credit_note';
  financialYear: string;
  supplierSnapshot: {
    name: string;
    gstin?: string;
    phone?: string;
    email?: string;
  };
  buyerSnapshot: {
    name: string;
    phone?: string;
    email?: string;
  };
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  grandTotal: number;
  isCancelled: boolean;
  issuedAt: string;
}

export const InvoicesRegisterPage: React.FC = () => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceHtml, setSelectedInvoiceHtml] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);

  const { data, isLoading } = useQuery<{ invoices: InvoiceAdminItem[] }>({
    queryKey: ['admin-invoices', filterType, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (searchQuery) params.append('search', searchQuery);
      const res = await api.get<{ invoices: InvoiceAdminItem[] }>(`/invoices/admin/register?${params.toString()}`);
      return res || { invoices: [] };
    },
  });

  const invoices = data?.invoices || [];

  const handleViewPdf = async (id: string) => {
    setIsLoadingPdf(true);
    try {
      const html = await api.get<string>(`/invoices/${id}/pdf`);
      setSelectedInvoiceHtml(html);
    } catch {
      alert('Could not render invoice document. Please try again.');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  const handleExportCsv = () => {
    window.open('/api/invoices/admin/export-csv', '_blank');
  };

  const getTypeBadge = (type: string, isCancelled: boolean) => {
    if (isCancelled) {
      return <Badge variant="rose">CANCELLED</Badge>;
    }
    switch (type) {
      case 'sale':
        return <Badge variant="emerald">SALE (TAX INVOICE)</Badge>;
      case 'commission':
        return <Badge variant="purple">COMMISSION INVOICE</Badge>;
      case 'credit_note':
        return <Badge variant="amber">CREDIT NOTE</Badge>;
      default:
        return <Badge variant="slate">{type.toUpperCase()}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">
            Statutory Tax Invoices & Statements Register
          </h1>
          <p className="text-xs text-admin-400 mt-1">
            Complete audit trail of sales invoices, platform commission tax invoices, and immutable credit notes.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleExportCsv}
          leftIcon={<Download className="w-4 h-4" />}
        >
          Export Register (CSV)
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-admin-800 pb-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {['all', 'sale', 'commission', 'credit_note'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterType === t
                  ? 'bg-terracotta-600 text-white shadow-admin-sm'
                  : 'text-admin-400 hover:text-white hover:bg-admin-800'
              }`}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-admin-900 border border-admin-700 rounded-xl text-xs text-white placeholder:text-admin-500 focus:outline-none focus:border-terracotta-500"
          />
          <Search className="w-4 h-4 text-admin-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-admin-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-16 p-8 space-y-2">
              <FileText className="w-10 h-10 text-admin-600 mx-auto" />
              <h3 className="font-bold text-sm text-admin-300">No Invoices Found</h3>
              <p className="text-xs text-admin-500">Invoices generated for sales and commissions will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-admin-950/60 border-b border-admin-800 text-admin-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Invoice #</th>
                    <th className="px-6 py-4">Document Type</th>
                    <th className="px-6 py-4">Issued Date</th>
                    <th className="px-6 py-4">Supplier / Creator</th>
                    <th className="px-6 py-4">Buyer / Customer</th>
                    <th className="px-6 py-4">Tax Breakdown (CGST/SGST/IGST)</th>
                    <th className="px-6 py-4">Grand Total</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-admin-800 text-admin-200">
                  {invoices.map((inv) => (
                    <tr key={inv._id} className="hover:bg-admin-800/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white font-mono">{inv.invoiceNumber}</td>
                      <td className="px-6 py-4">{getTypeBadge(inv.type, inv.isCancelled)}</td>
                      <td className="px-6 py-4 text-admin-400">
                        {new Date(inv.issuedAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 font-semibold text-white">
                        {inv.supplierSnapshot?.name}
                      </td>
                      <td className="px-6 py-4 text-admin-300">
                        {inv.buyerSnapshot?.name}
                      </td>
                      <td className="px-6 py-4">
                        {inv.igstTotal > 0 ? (
                          <span className="text-blue-400 font-mono">IGST: {formatINR(inv.igstTotal)}</span>
                        ) : inv.cgstTotal > 0 ? (
                          <span className="text-emerald-400 font-mono">
                            CGST+SGST: {formatINR(inv.cgstTotal + inv.sgstTotal)}
                          </span>
                        ) : (
                          <span className="text-admin-500">₹0 (Non-GST / Exempt)</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-bold text-white text-sm">
                        {formatINR(inv.grandTotal)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleViewPdf(inv._id)}
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          View / Print PDF
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

      {/* A4 PRINTABLE DOCUMENT VIEWER MODAL */}
      <Modal
        isOpen={!!selectedInvoiceHtml}
        onClose={() => setSelectedInvoiceHtml(null)}
        title="Official Statutory Invoice Document"
        maxWidth="3xl"
      >
        {selectedInvoiceHtml && (
          <div className="space-y-4">
            <div
              className="bg-white p-6 rounded-2xl border border-admin-800 text-charcoal-900 max-h-[65vh] overflow-y-auto text-xs"
              dangerouslySetInnerHTML={{ __html: selectedInvoiceHtml }}
            />
            <div className="flex justify-end gap-3 pt-3 border-t border-admin-800">
              <Button variant="secondary" size="sm" onClick={() => setSelectedInvoiceHtml(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const printWindow = window.open('', '_blank');
                  if (printWindow) {
                    printWindow.document.write(selectedInvoiceHtml);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Print / Save PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
