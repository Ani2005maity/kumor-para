import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  actorId: Types.ObjectId;
  actorRole: string; // e.g. 'admin' | 'seller' | 'customer'
  action: string; // e.g. 'seller_approved', 'product_rejected', 'commission_updated', 'invoice_cancelled', 'settlement_processed', 'account_suspended'
  entityType: string; // e.g. 'Seller', 'Product', 'Invoice', 'SellerOrder', 'User', 'Settings'
  entityId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  ip?: string | null;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorRole: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    entityId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ip: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: false,
  }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
