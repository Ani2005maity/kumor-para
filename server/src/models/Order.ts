import mongoose, { Document, Schema, Types } from 'mongoose';
import { PaymentStatus, IAddress } from '@kumorpara/shared';
import { AddressSchema } from './Address.js';

export interface IOrder extends Document {
  _id: Types.ObjectId;
  orderNumber: string; // e.g. "KP000123"
  customerId: Types.ObjectId;
  shippingAddress: IAddress;
  billingAddress: IAddress;
  itemsSubtotal: number; // in paise (Integer)
  deliveryFee: number; // in paise (Integer)
  grandTotal: number; // in paise (Integer)
  paymentStatus: PaymentStatus;
  placedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    shippingAddress: {
      type: AddressSchema,
      required: true,
    },
    billingAddress: {
      type: AddressSchema,
      required: true,
    },
    itemsSubtotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'itemsSubtotal must be an integer in paise',
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
    grandTotal: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: 'grandTotal must be an integer in paise',
      },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
      index: true,
    },
    placedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
