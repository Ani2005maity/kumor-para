import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';
import { Invoice, IInvoice } from '../models/Invoice.js';
import { InvoiceCounter } from '../models/InvoiceCounter.js';
import { SellerOrder } from '../models/SellerOrder.js';
import { Order } from '../models/Order.js';
import { Seller } from '../models/Seller.js';
import { User } from '../models/User.js';
import { Settings } from '../models/Settings.js';
import { EmailService } from './email.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { amountInWords, formatCurrency, paiseToRupees } from '@kumorpara/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEMPLATES_DIR = path.resolve(__dirname, '../templates');

/**
 * Format Address helper for templates
 */
function formatAddress(addr: any): string {
  if (!addr) return '';
  if (typeof addr === 'string') return addr;
  const parts = [
    addr.street,
    addr.landmark,
    addr.city,
    addr.state,
    addr.pincode ? `PIN: ${addr.pincode}` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Helper to convert any Mongoose subdocument / object into a plain JS object
 */
function toPlainObject(obj: any): any {
  if (!obj) return obj;
  if (typeof obj.toObject === 'function') return obj.toObject();
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Atomically allocates a unique sequential invoice number per financial year.
 * Concurrency-safe via MongoDB findOneAndUpdate with $inc.
 */
export async function allocateInvoiceNumber(
  financialYear: string = '2026-27',
  type: 'sale' | 'commission' = 'sale'
): Promise<{ invoiceNumber: string; sequence: number }> {
  const counter = await InvoiceCounter.findOneAndUpdate(
    { financialYear, type },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const prefix = type === 'commission' ? 'KPC' : 'KP';
  const paddedSeq = counter.sequence.toString().padStart(6, '0');
  const invoiceNumber = `${prefix}/${financialYear}/${paddedSeq}`;

  return { invoiceNumber, sequence: counter.sequence };
}

/**
 * Generates a Customer Invoice / Bill of Supply for a given SellerOrder
 */
export async function generateCustomerInvoice(sellerOrderId: string): Promise<IInvoice> {
  const sellerOrder = await SellerOrder.findById(sellerOrderId);
  if (!sellerOrder) {
    throw new AppError('SellerOrder not found', 404);
  }

  // If invoice already exists, return existing record
  if (sellerOrder.invoiceId) {
    const existingInvoice = await Invoice.findById(sellerOrder.invoiceId);
    if (existingInvoice) return existingInvoice;
  }

  const [order, seller] = await Promise.all([
    Order.findById(sellerOrder.orderId),
    Seller.findById(sellerOrder.sellerId).populate('userId', 'email phone name'),
  ]);

  if (!order || !seller) {
    throw new AppError('Associated Order or Seller record missing', 500);
  }

  const customer = await User.findById(order.customerId);
  const settings = await Settings.findOne();
  const financialYear = settings?.financialYear || '2026-27';

  // 1. Allocate unique sequential number atomically
  const { invoiceNumber } = await allocateInvoiceNumber(financialYear, 'sale');

  // 2. Determine GST status & Place of supply
  const hasGstin = Boolean(seller.gstin && seller.gstin.trim().length > 0);
  const sellerStateCode = seller.pickupAddress?.stateCode || '19';
  const buyerShipping = order.shippingAddress;
  const placeOfSupplyStateCode = buyerShipping?.stateCode || sellerStateCode;
  const isIntraState = sellerStateCode === placeOfSupplyStateCode;

  // 3. Compute Line Items and Tax Splitting
  let taxableTotal = 0;
  let taxTotal = 0;

  const lineItems = sellerOrder.items.map((item) => {
    const lineTotal = item.lineTotal; // in paise
    const gstRate = item.gstRate || 0;

    let taxableValue = lineTotal;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (hasGstin && gstRate > 0) {
      // Calculate backward taxable value: taxableValue = round(lineTotal / (1 + rate/100))
      taxableValue = Math.round(lineTotal / (1 + gstRate / 100));
      const totalTax = lineTotal - taxableValue;

      if (isIntraState) {
        cgst = Math.round(totalTax / 2);
        sgst = totalTax - cgst;
        igst = 0;
      } else {
        cgst = 0;
        sgst = 0;
        igst = totalTax;
      }
    }

    taxableTotal += taxableValue;
    taxTotal += cgst + sgst + igst;

    return {
      title: item.title,
      hsnCode: item.hsnCode || '',
      qty: item.qty,
      unitPrice: item.unitPrice,
      discount: 0,
      taxableValue,
      gstRate,
      cgst,
      sgst,
      igst,
      lineTotal,
    };
  });

  const deliveryCharge = sellerOrder.deliveryFee || 0;
  const grandTotal = taxableTotal + taxTotal + deliveryCharge;

  const sellerUser = seller.userId as any;

  // 4. Create Snapshots
  const supplierSnapshot = {
    name: seller.legalName || seller.shopName,
    address: toPlainObject(seller.pickupAddress),
    gstin: seller.gstin || null,
    phone: seller.pickupAddress?.phone || sellerUser?.phone || '+919830000000',
    email: sellerUser?.email || 'artisan@kumorpara.com',
  };

  const buyerSnapshot = {
    name: order.shippingAddress.name,
    billingAddress: toPlainObject(order.billingAddress),
    shippingAddress: toPlainObject(order.shippingAddress),
    phone: order.shippingAddress.phone,
    email: customer?.email || 'customer@example.com',
  };

  const words = amountInWords(grandTotal);

  // 5. Create Immutable Invoice Record
  const invoice = await Invoice.create({
    invoiceNumber,
    type: 'sale',
    sellerOrderId: sellerOrder._id,
    orderId: order._id,
    issuedAt: new Date(),
    financialYear,
    supplierSnapshot,
    buyerSnapshot,
    placeOfSupplyStateCode,
    lineItems,
    deliveryCharge,
    taxableTotal,
    taxTotal,
    grandTotal,
    amountInWords: words,
    pdfUrl: `/api/invoices/${invoiceNumber}/download`,
    isCancelled: false,
  });

  // Link invoice back to SellerOrder
  sellerOrder.invoiceId = invoice._id;
  await sellerOrder.save();

  // 6. Asynchronous Non-Blocking Email Dispatch
  if (buyerSnapshot.email) {
    EmailService.sendInvoiceEmail(invoice, buyerSnapshot.email).catch((e) =>
      console.warn('Async email delivery error:', e.message)
    );
  }

  return invoice;
}

/**
 * Cancels an issued invoice and creates an immutable linked Credit Note
 */
export async function cancelInvoiceAndIssueCreditNote(
  invoiceId: string,
  reason: string = 'Order Cancellation / Return',
  _actorId?: string
): Promise<{ originalInvoice: IInvoice; creditNote: IInvoice }> {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) {
    throw new AppError('Invoice not found', 404);
  }

  if (invoice.isCancelled) {
    throw new AppError('Invoice is already cancelled', 400);
  }

  const { invoiceNumber: creditNoteNumber } = await allocateInvoiceNumber(
    invoice.financialYear,
    'sale'
  );

  // Build reversal line items
  const reversalLineItems = invoice.lineItems.map((item) => ({
    title: item.title,
    hsnCode: item.hsnCode,
    qty: item.qty,
    unitPrice: item.unitPrice,
    discount: item.discount || 0,
    taxableValue: item.taxableValue,
    gstRate: item.gstRate,
    cgst: item.cgst,
    sgst: item.sgst,
    igst: item.igst,
    lineTotal: item.lineTotal,
  }));

  const creditNote = await Invoice.create({
    invoiceNumber: creditNoteNumber,
    type: 'credit_note',
    sellerOrderId: invoice.sellerOrderId,
    orderId: invoice.orderId,
    issuedAt: new Date(),
    financialYear: invoice.financialYear,
    supplierSnapshot: invoice.supplierSnapshot,
    buyerSnapshot: invoice.buyerSnapshot,
    placeOfSupplyStateCode: invoice.placeOfSupplyStateCode,
    lineItems: reversalLineItems,
    deliveryCharge: invoice.deliveryCharge,
    taxableTotal: invoice.taxableTotal,
    taxTotal: invoice.taxTotal,
    grandTotal: invoice.grandTotal,
    amountInWords: invoice.amountInWords,
    pdfUrl: `/api/invoices/${creditNoteNumber}/download`,
    isCancelled: false,
    creditNoteId: invoice._id,
  });

  // Mark original invoice as cancelled and link to credit note
  invoice.isCancelled = true;
  invoice.creditNoteId = creditNote._id;
  await invoice.save();

  return { originalInvoice: invoice, creditNote };
}

/**
 * Renders HTML for any invoice document (Customer, Commission, or Credit Note)
 */
export async function renderInvoiceHtml(invoice: IInvoice): Promise<string> {
  let templateFileName = 'invoice-customer.hbs';
  if (invoice.type === 'credit_note') {
    templateFileName = 'credit-note.hbs';
  } else if (invoice.type === 'commission') {
    templateFileName = 'invoice-commission.hbs';
  }

  const templatePath = path.join(TEMPLATES_DIR, templateFileName);
  let templateSource = '';

  try {
    templateSource = fs.readFileSync(templatePath, 'utf8');
  } catch (err) {
    templateSource = `<h1>Invoice {{invoiceNumber}}</h1><p>Grand Total: {{grandTotalFormatted}}</p>`;
  }

  const compiled = handlebars.compile(templateSource);

  // Convert to plain JS object to avoid Mongoose subdocument prototype restrictions
  const rawInvoice = toPlainObject(invoice);

  const hasGstin = Boolean(rawInvoice.supplierSnapshot?.gstin);
  const docTitle =
    rawInvoice.type === 'credit_note'
      ? 'CREDIT NOTE'
      : rawInvoice.type === 'commission'
      ? 'COMMISSION INVOICE'
      : hasGstin
      ? 'TAX INVOICE'
      : 'BILL OF SUPPLY';

  const isIntraState =
    rawInvoice.placeOfSupplyStateCode ===
    (typeof rawInvoice.supplierSnapshot?.address === 'object'
      ? (rawInvoice.supplierSnapshot.address as any)?.stateCode
      : '19');

  let originalInvoiceNumber = '';
  if (rawInvoice.creditNoteId) {
    const orig = await Invoice.findById(rawInvoice.creditNoteId);
    originalInvoiceNumber = orig ? orig.invoiceNumber : '';
  }

  const templateData = {
    docTitle,
    invoiceNumber: rawInvoice.invoiceNumber,
    formattedDate: new Date(rawInvoice.issuedAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    orderNumber: rawInvoice.orderId ? rawInvoice.orderId.toString() : 'Direct Service',
    financialYear: rawInvoice.financialYear,
    placeOfSupplyStateCode: rawInvoice.placeOfSupplyStateCode,
    isCancelled: rawInvoice.isCancelled,
    hasGstin,
    isIntraState,
    originalInvoiceNumber,
    supplierSnapshot: {
      name: rawInvoice.supplierSnapshot?.name || '',
      phone: rawInvoice.supplierSnapshot?.phone || '',
      email: rawInvoice.supplierSnapshot?.email || '',
      gstin: rawInvoice.supplierSnapshot?.gstin || '',
      address: rawInvoice.supplierSnapshot?.address,
    },
    supplierAddressString: formatAddress(rawInvoice.supplierSnapshot?.address),
    buyerSnapshot: {
      name: rawInvoice.buyerSnapshot?.name || '',
      phone: rawInvoice.buyerSnapshot?.phone || '',
      email: rawInvoice.buyerSnapshot?.email || '',
      billingAddress: rawInvoice.buyerSnapshot?.billingAddress,
      shippingAddress: rawInvoice.buyerSnapshot?.shippingAddress,
    },
    buyerShippingString: formatAddress(rawInvoice.buyerSnapshot?.shippingAddress),
    amountInWords: rawInvoice.amountInWords,
    taxableTotalFormatted: formatCurrency(rawInvoice.taxableTotal),
    taxTotalFormatted: formatCurrency(rawInvoice.taxTotal),
    cgstTotalFormatted: formatCurrency(Math.round(rawInvoice.taxTotal / 2)),
    sgstTotalFormatted: formatCurrency(rawInvoice.taxTotal - Math.round(rawInvoice.taxTotal / 2)),
    igstTotalFormatted: formatCurrency(rawInvoice.taxTotal),
    deliveryChargeFormatted: formatCurrency(rawInvoice.deliveryCharge),
    grandTotalFormatted: formatCurrency(rawInvoice.grandTotal),
    lineItems: (rawInvoice.lineItems || []).map((item: any, i: number) => ({
      index: i + 1,
      title: item.title,
      hsnCode: item.hsnCode,
      qty: item.qty,
      unitPriceFormatted: formatCurrency(item.unitPrice),
      taxableValueFormatted: formatCurrency(item.taxableValue),
      gstRate: item.gstRate,
      halfRate: ((item.gstRate || 0) / 2).toFixed(1),
      cgstFormatted: formatCurrency(item.cgst),
      sgstFormatted: formatCurrency(item.sgst),
      igstFormatted: formatCurrency(item.igst),
      taxFormatted: formatCurrency(item.cgst + item.sgst + item.igst),
      lineTotalFormatted: formatCurrency(item.lineTotal),
    })),
  };

  return compiled(templateData, { allowProtoPropertiesByDefault: true });
}
