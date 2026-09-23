import mongoose, { Document, Schema, Types } from 'mongoose';
import { UserRole, IAddress } from '@kumorpara/shared';
import { AddressSchema } from './Address.js';

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  isAccountActive: boolean;
  isDemoAccount?: boolean;
  addresses: Types.DocumentArray<IAddress & Document>;
  wishlist: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['customer', 'seller', 'admin'],
      default: 'customer',
      required: true,
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    phoneVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isAccountActive: {
      type: Boolean,
      default: false,
      index: true,
    },
    isDemoAccount: {
      type: Boolean,
      default: false,
      index: true,
    },
    addresses: {
      type: [AddressSchema],
      default: [],
    },
    wishlist: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
