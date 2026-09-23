import { Request, Response, NextFunction } from 'express';
import { Invoice } from '../models/Invoice.js';
import { Order } from '../models/Order.js';
import { SellerOrder } from '../models/SellerOrder.js';
import { Seller } from '../models/Seller.js';
import {
  renderInvoiceHtml,
  cancelInvoiceAndIssueCreditNote,
  generateCustomerInvoice,
} from '../services/invoice.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { ApiResponse, paiseToRupees } from '@kumorpara/shared';

/**
 * Access Control Helper for Invoices
 */
async function verifyInvoiceAccess(invoice: any, user: any, seller?: any): Promise<void> {
  if (user.role === 'admin') {
    return; // Admin has full access to all invoices
  }

  if (user.role === 'customer') {
    if (invoice.orderId) {
      const order = await Order.findById(invoice.orderId);
      if (order && order.customerId.toString() === user._id.toString()) {
        return;
      }
    }
    throw new AppError('Forbidden: You can only access invoices for your own orders', 403);
  }

  if (user.role === 'seller') {
    const sellerDoc = seller || (await Seller.findOne({ userId: user._id }));
    if (!sellerDoc) {
      throw new AppError('Forbidden: Seller profile not found', 403);
    }

    // 1. Direct seller order match
    if (invoice.sellerOrderId) {
      const sellerOrder = await SellerOrder.findById(invoice.sellerOrderId);
      if (sellerOrder && sellerOrder.sellerId.toString() === sellerDoc._id.toString()) {
        return;
      }
    }

    // 2. Fallback match via master order ID
    if (invoice.orderId) {
      const sellerOrder = await SellerOrder.findOne({
        orderId: invoice.orderId,
        sellerId: sellerDoc._id,
      });
      if (sellerOrder) {
        return;
      }
    }

    // 3. Commission invoice match
    if (invoice.type === 'commission') {
      if (invoice.sellerOrderId) {
        const sellerOrder = await SellerOrder.findById(invoice.sellerOrderId);
        if (sellerOrder && sellerOrder.sellerId.toString() === sellerDoc._id.toString()) {
          return;
        }
      }
      if (
        invoice.supplierSnapshot?.name === (sellerDoc.legalName || sellerDoc.shopName) ||
        invoice.buyerSnapshot?.name === (sellerDoc.legalName || sellerDoc.shopName)
      ) {
        return;
      }
    }

    // 4. Credit note match
    if (invoice.type === 'credit_note') {
      if (invoice.sellerOrderId) {
        const sellerOrder = await SellerOrder.findById(invoice.sellerOrderId);
        if (sellerOrder && sellerOrder.sellerId.toString() === sellerDoc._id.toString()) {
          return;
        }
      }
      if (
        invoice.supplierSnapshot?.name === (sellerDoc.legalName || sellerDoc.shopName) ||
        invoice.buyerSnapshot?.name === (sellerDoc.legalName || sellerDoc.shopName)
      ) {
        return;
      }
    }

    throw new AppError('Forbidden: You can only access invoices for your own shop', 403);
  }

  throw new AppError('Unauthorized to view this invoice', 403);
}

/**
 * Get single invoice JSON details
 */
export async function getInvoiceById(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    // Allow lookup by Mongo ID or invoiceNumber (e.g. KP/2026-27/000001)
    const invoice = await Invoice.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { invoiceNumber: id }],
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    await verifyInvoiceAccess(invoice, req.user!, req.seller);

    res.json({
      success: true,
      data: {
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Stream/Download printable invoice document (HTML/PDF)
 */
export async function streamInvoiceDocument(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { invoiceNumber: id }],
    });

    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    await verifyInvoiceAccess(invoice, req.user!, req.seller);

    const html = await renderInvoiceHtml(invoice);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${invoice.invoiceNumber.replace(/\//g, '_')}.html"`
    );
    res.send(html);
  } catch (error) {
    next(error);
  }
}

/**
 * Customer: Get list of own invoices
 */
export async function getCustomerInvoices(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const customerId = req.user!._id;
    const orders = await Order.find({ customerId }).select('_id');
    const orderIds = orders.map((o) => o._id);

    const invoices = await Invoice.find({ orderId: { $in: orderIds } }).sort({ issuedAt: -1 });

    res.json({
      success: true,
      data: {
        invoices,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Get list of own invoices
 */
export async function getSellerInvoices(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const sellerId = req.seller!._id;
    const sellerOrders = await SellerOrder.find({ sellerId }).select('_id');
    const sellerOrderIds = sellerOrders.map((so) => so._id);

    const invoices = await Invoice.find({
      $or: [{ sellerOrderId: { $in: sellerOrderIds } }, { type: 'commission' }],
    }).sort({ issuedAt: -1 });

    res.json({
      success: true,
      data: {
        invoices,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Get all invoices register with filters
 */
export async function getAdminInvoices(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.financialYear) filter.financialYear = req.query.financialYear;
    if (req.query.isCancelled !== undefined) filter.isCancelled = req.query.isCancelled === 'true';
    if (req.query.search) {
      filter.invoiceNumber = new RegExp(req.query.search as string, 'i');
    }

    const [invoices, total] = await Promise.all([
      Invoice.find(filter).sort({ issuedAt: -1 }).skip(skip).limit(limit),
      Invoice.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        invoices,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Cancel Invoice and Issue Credit Note
 */
export async function cancelInvoice(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    await verifyInvoiceAccess(invoice, req.user!, req.seller);

    const { originalInvoice, creditNote } = await cancelInvoiceAndIssueCreditNote(
      invoice._id.toString(),
      reason || 'Customer cancellation',
      req.user!._id.toString()
    );

    res.json({
      success: true,
      data: {
        originalInvoice,
        creditNote,
      },
      message: 'Invoice cancelled and Credit Note generated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Export Invoices Register as CSV
 */
export async function exportAdminInvoicesCsv(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const filter: any = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.financialYear) filter.financialYear = req.query.financialYear;

    const invoices = await Invoice.find(filter).sort({ issuedAt: -1 }).limit(1000);

    const headers = [
      'Invoice Number',
      'Type',
      'Issued Date',
      'Supplier Name',
      'Supplier GSTIN',
      'Buyer Name',
      'Place of Supply',
      'Taxable Total (Rs)',
      'Tax Total (Rs)',
      'Delivery Charge (Rs)',
      'Grand Total (Rs)',
      'Status',
    ];

    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      inv.type,
      new Date(inv.issuedAt).toISOString().split('T')[0],
      `"${inv.supplierSnapshot.name.replace(/"/g, '""')}"`,
      inv.supplierSnapshot.gstin || 'N/A',
      `"${inv.buyerSnapshot.name.replace(/"/g, '""')}"`,
      inv.placeOfSupplyStateCode,
      paiseToRupees(inv.taxableTotal).toFixed(2),
      paiseToRupees(inv.taxTotal).toFixed(2),
      paiseToRupees(inv.deliveryCharge).toFixed(2),
      paiseToRupees(inv.grandTotal).toFixed(2),
      inv.isCancelled ? 'CANCELLED' : 'ACTIVE',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="invoices-register.csv"');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
}

/**
 * Trigger Generation helper for testing / internal workflows
 */
export async function triggerCustomerInvoice(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { sellerOrderId } = req.body;
    const invoice = await generateCustomerInvoice(sellerOrderId);
    res.status(201).json({
      success: true,
      data: {
        invoice,
      },
      message: 'Customer invoice generated successfully.',
    });
  } catch (error) {
    next(error);
  }
}
