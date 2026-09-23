import { Router } from 'express';
import {
  getInvoiceById,
  streamInvoiceDocument,
  getCustomerInvoices,
  getSellerInvoices,
  getAdminInvoices,
  cancelInvoice,
  exportAdminInvoicesCsv,
  triggerCustomerInvoice,
} from '../controllers/invoice.controller.js';
import { requireAuth, requireSeller, requireAdmin } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Streaming & Viewing (Access Controlled)
router.get('/:id/download', requireAuth, streamInvoiceDocument);
router.get('/:id/pdf', requireAuth, streamInvoiceDocument);
router.get('/detail/:id', requireAuth, getInvoiceById);

// Role-based Invoices Registers
router.get('/customer/my-invoices', requireAuth, getCustomerInvoices);
router.get('/seller/my-invoices', requireAuth, requireSeller, getSellerInvoices);
router.get('/admin/register', requireAuth, requireAdmin, getAdminInvoices);
router.get('/admin/export-csv', requireAuth, requireAdmin, exportAdminInvoicesCsv);

// Cancellation & Credit Notes
router.post('/cancel/:id', requireAuth, writeLimiter, cancelInvoice);
router.post('/generate', requireAuth, writeLimiter, triggerCustomerInvoice);

export default router;
