import mongoose, { Document, Schema, Types } from 'mongoose';
import { SellerStatus, IAddress } from '@kumorpara/shared';
import { AddressSchema } from './Address.js';

export interface ISeller extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  shopName: string;
  slug: string;
  legalName: string;
  bio?: string;
  location: string;
  pickupAddress: IAddress;
  gstin?: string | null;
  panLast4?: string | null;
  logoUrl?: string;
  bannerUrl?: string;
  status: SellerStatus;
  rejectionReason?: string | null;
  commissionRate?: number | null; // e.g., 12 for 12%, falls back to category default then platform default
  rating: number;
  totalSales: number;
  createdAt: Date;
  updatedAt: Date;
}

const SellerSchema = new Schema<ISeller>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    shopName: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    legalName: {
      type: String,
      required: [true, 'Legal entity name is required'],
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    pickupAddress: {
      type: AddressSchema,
      required: true,
    },
    gstin: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    panLast4: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    logoUrl: {
      type: String,
      default: '',
    },
    bannerUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    commissionRate: {
      type: Number,
      default: null, // If null, falls back to category rate then platform setting
      min: 0,
      max: 100,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalSales: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Seller = mongoose.model<ISeller>('Seller', SellerSchema);
