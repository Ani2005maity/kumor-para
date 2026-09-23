import mongoose, { Document, Schema, Types } from 'mongoose';
import { SellerOrderStatus, SettlementStatus, IOrderItemSnapshot } from '@kumorpara/shared';

export interface IOrderItemDocument extends IOrderItemSnapshot {}

export interface IStatusHistoryItem {
  status: SellerOrderStatus;
  at: Date;
  byUserId: Types.ObjectId;
}

export interface ISellerOrder extends Document {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  sellerId: Types.ObjectId;
  items: IOrderItemDocument[];
  subtotal: number; // in paise (Integer)
  deliveryFee: number; // in paise (Integer)
  commissionRate: number; // applied rate percentage, e.g. 10 for 10%
  commissionAmount: number; // in paise (Integer)
  sellerPayout: number; // in paise (subtotal - commissionAmount)
  status: SellerOrderStatus;
  statusHistory: IStatusHistoryItem[];
  courierName?: string | null;
  trackingRef?: string | null;
  settlementStatus: SettlementStatus;
  settledAt?: Date | null;
  invoiceId?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItemDocument>(
  {
    productId: {
      type: Schema.Types.ObjectId as any,
      ref: 'Product',
      required: true,
    },
    title: { type: String, required: true, trim: true },
    image: { type: String, required: true },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'unitPrice must be an integer in paise',
      },
    },
    qty: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'qty must be a positive integer',
      },
    },
    customisationNote: { type: String, default: '' },
    hsnCode: { type: String, default: '' },
    gstRate: { type: Number, default: 0 },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'lineTotal must be an integer in paise',
      },
    },
  },
  { _id: true }
);

const StatusHistorySchema = new Schema<IStatusHistoryItem>(
  {
    status: {
      type: String,
      enum: ['new', 'accepted', 'preparing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled'],
      required: true,
    },
    at: {
      type: Date,
      default: Date.now,
    },
    byUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { _id: false }
);

const SellerOrderSchema = new Schema<ISellerOrder>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true,
    },
    items: {
      type: [OrderItemSchema],
      required: true,
      validate: {
        validator: (arr: IOrderItemDocument[]) => Array.isArray(arr) && arr.length > 0,
        message: 'SellerOrder must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'subtotal must be an integer in paise',
      },
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'deliveryFee must be an integer in paise',
      },
    },
    commissionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    commissionAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'commissionAmount must be an integer in paise',
      },
    },
    sellerPayout: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'sellerPayout must be an integer in paise',
      },
    },
    status: {
      type: String,
      enum: ['new', 'accepted', 'preparing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled'],
      default: 'new',
      index: true,
    },
    statusHistory: {
      type: [StatusHistorySchema],
      default: [],
    },
    courierName: {
      type: String,
      default: null,
      trim: true,
    },
    trackingRef: {
      type: String,
      default: null,
      trim: true,
    },
    settlementStatus: {
      type: String,
      enum: ['pending', 'settled'],
      default: 'pending',
      index: true,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
SellerOrderSchema.index({ sellerId: 1, status: 1 });
SellerOrderSchema.index({ sellerId: 1, settlementStatus: 1 });

export const SellerOrder = mongoose.model<ISellerOrder>('SellerOrder', SellerOrderSchema);
