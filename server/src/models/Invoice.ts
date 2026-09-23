import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  InvoiceType,
  ISupplierSnapshot,
  IBuyerSnapshot,
  IInvoiceLineItem,
} from '@kumorpara/shared';

export interface IInvoice extends Document {
  _id: Types.ObjectId;
  invoiceNumber: string; // e.g. "KP/2026-27/000123" or "KPC/2026-27/000045"
  type: InvoiceType;
  sellerOrderId?: Types.ObjectId | null;
  orderId?: Types.ObjectId | null;
  issuedAt: Date;
  financialYear: string;
  supplierSnapshot: ISupplierSnapshot;
  buyerSnapshot: IBuyerSnapshot;
  placeOfSupplyStateCode: string;
  lineItems: IInvoiceLineItem[];
  deliveryCharge: number; // in paise (Integer)
  taxableTotal: number; // in paise (Integer)
  taxTotal: number; // in paise (Integer)
  grandTotal: number; // in paise (Integer)
  amountInWords: string;
  pdfUrl?: string | null;
  pdfPublicId?: string | null;
  isCancelled: boolean;
  creditNoteId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const SupplierSnapshotSchema = new Schema<ISupplierSnapshot>(
  {
    name: { type: String, required: true },
    address: { type: Schema.Types.Mixed, required: true },
    gstin: { type: String, default: null },
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false }
);

const BuyerSnapshotSchema = new Schema<IBuyerSnapshot>(
  {
    name: { type: String, required: true },
    billingAddress: { type: Schema.Types.Mixed, required: true },
    shippingAddress: { type: Schema.Types.Mixed, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false }
);

const LineItemSchema = new Schema<IInvoiceLineItem>(
  {
    title: { type: String, required: true },
    hsnCode: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    taxableValue: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, default: 0, min: 0 },
    cgst: { type: Number, default: 0, min: 0 },
    sgst: { type: Number, default: 0, min: 0 },
    igst: { type: Number, default: 0, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['sale', 'commission', 'credit_note'],
      required: true,
      index: true,
    },
    sellerOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'SellerOrder',
      default: null,
      index: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    financialYear: {
      type: String,
      required: true,
      trim: true,
    },
    supplierSnapshot: {
      type: SupplierSnapshotSchema,
      required: true,
    },
    buyerSnapshot: {
      type: BuyerSnapshotSchema,
      required: true,
    },
    placeOfSupplyStateCode: {
      type: String,
      required: true,
      trim: true,
    },
    lineItems: {
      type: [LineItemSchema],
      required: true,
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'deliveryCharge must be an integer in paise',
      },
    },
    taxableTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'taxableTotal must be an integer in paise',
      },
    },
    taxTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'taxTotal must be an integer in paise',
      },
    },
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'grandTotal must be an integer in paise',
      },
    },
    amountInWords: {
      type: String,
      required: true,
      trim: true,
    },
    pdfUrl: {
      type: String,
      default: null,
    },
    pdfPublicId: {
      type: String,
      default: null,
    },
    isCancelled: {
      type: Boolean,
      default: false,
      index: true,
    },
    creditNoteId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save immutability hook: Once issued, an invoice is never edited.
// Only pdfUrl, pdfPublicId, isCancelled, and creditNoteId may be modified on existing documents.
InvoiceSchema.pre('save', function (next) {
  if (!this.isNew) {
    const allowedModifications = ['pdfUrl', 'pdfPublicId', 'isCancelled', 'creditNoteId', 'updatedAt'];
    const modifiedPaths = this.modifiedPaths();
    const disallowedPaths = modifiedPaths.filter((path) => !allowedModifications.includes(path));

    if (disallowedPaths.length > 0) {
      return next(
        new Error(
          `Immutability Violation: Invoices are immutable once issued. Cannot modify fields: ${disallowedPaths.join(
            ', '
          )}`
        )
      );
    }
  }
  next();
});

export const Invoice = mongoose.model<IInvoice>('Invoice', InvoiceSchema);
