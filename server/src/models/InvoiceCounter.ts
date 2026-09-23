import mongoose, { Document, Schema } from 'mongoose';
import { InvoiceType } from '@kumorpara/shared';

export interface IInvoiceCounter extends Document {
  financialYear: string; // e.g. "2026-27"
  type: 'sale' | 'commission';
  sequence: number;
  updatedAt: Date;
}

const InvoiceCounterSchema = new Schema<IInvoiceCounter>(
  {
    financialYear: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['sale', 'commission'],
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

InvoiceCounterSchema.index({ financialYear: 1, type: 1 }, { unique: true });

export const InvoiceCounter = mongoose.model<IInvoiceCounter>('InvoiceCounter', InvoiceCounterSchema);
