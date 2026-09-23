import mongoose, { Document, Schema } from 'mongoose';

export interface ISettings extends Document {
  platformCommissionRate: number; // percentage e.g. 10 for 10%
  invoiceTrigger: 'payment_confirmed' | 'dispatched';
  financialYear: string; // e.g. "2026-27"
  enableTotp2FA: boolean;
  tcsRate: number; // e.g. 1 for 1% TCS under GST
  tdsRate: number; // e.g. 0.1 for 0.1% TDS under 194-O
  updatedAt: Date;
  createdAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    platformCommissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
      required: true,
    },
    invoiceTrigger: {
      type: String,
      enum: ['payment_confirmed', 'dispatched'],
      default: 'payment_confirmed',
      required: true,
    },
    financialYear: {
      type: String,
      default: '2026-27',
      required: true,
      trim: true,
    },
    enableTotp2FA: {
      type: Boolean,
      default: false,
    },
    tcsRate: {
      type: Number,
      default: 0,
      min: 0,
    },
    tdsRate: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
