import mongoose, { Document, Schema, Types } from 'mongoose';
import { PaymentStatus, PaymentProvider } from '@kumorpara/shared';

export interface IPayment extends Document {
  _id: Types.ObjectId;
  orderId: Types.ObjectId;
  provider: PaymentProvider;
  providerRef?: string | null;
  amount: number; // in paise (Integer)
  status: PaymentStatus;
  rawPayloadHash?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['mock', 'razorpay'],
      default: 'mock',
      required: true,
    },
    providerRef: {
      type: String,
      default: null,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'amount must be an integer in paise',
      },
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },
    rawPayloadHash: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for idempotent webhook looks up
PaymentSchema.index({ provider: 1, providerRef: 1 });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
