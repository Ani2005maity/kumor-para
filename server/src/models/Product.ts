import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  ProductFulfilmentType,
  ProductStatus,
  IProductDimension,
  IProductImage,
} from '@kumorpara/shared';

export interface IProduct extends Document {
  _id: Types.ObjectId;
  sellerId: Types.ObjectId;
  categoryId: Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  price: number; // in paise (Integer)
  discountPrice?: number | null; // in paise (Integer)
  stock: number; // Integer >= 0
  fulfilmentType: ProductFulfilmentType;
  productionDays?: number; // Required if made_to_order
  customisationAvailable: boolean;
  customisationPrompt?: string | null;
  materials: string[];
  dimensions: IProductDimension;
  colors: string[];
  images: IProductImage[];
  hsnCode: string;
  gstRate: number; // e.g. 0, 5, 12, 18
  status: ProductStatus;
  rejectionReason?: string | null;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DimensionSchema = new Schema<IProductDimension>(
  {
    l: { type: Number, required: true, min: 0 },
    w: { type: Number, required: true, min: 0 },
    h: { type: Number, required: true, min: 0 },
    unit: {
      type: String,
      enum: ['cm', 'inch', 'mm'],
      default: 'cm',
    },
  },
  { _id: false }
);

const ImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    alt: { type: String, default: '' },
  },
  { _id: false }
);

const ProductSchema = new Schema<IProduct>(
  {
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price in paise is required'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Price must be an integer in paise',
      },
    },
    discountPrice: {
      type: Number,
      default: null,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator: (v: number | null) => v === null || Number.isInteger(v),
        message: 'Discount price must be an integer in paise',
      },
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Stock cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Stock must be an integer',
      },
    },
    fulfilmentType: {
      type: String,
      enum: ['ready_stock', 'made_to_order'],
      default: 'ready_stock',
      required: true,
    },
    productionDays: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function (this: IProduct, val: number) {
          if (this.fulfilmentType === 'made_to_order') {
            return typeof val === 'number' && val > 0;
          }
          return true;
        },
        message: 'Production days is required and must be greater than 0 for made-to-order items',
      },
    },
    customisationAvailable: {
      type: Boolean,
      default: false,
    },
    customisationPrompt: {
      type: String,
      default: null,
      trim: true,
    },
    materials: {
      type: [String],
      default: [],
    },
    dimensions: {
      type: DimensionSchema,
      default: () => ({ l: 0, w: 0, h: 0, unit: 'cm' }),
    },
    colors: {
      type: [String],
      default: [],
    },
    images: {
      type: [ImageSchema],
      default: [],
      validate: {
        validator: (arr: IProductImage[]) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one product image is required',
      },
    },
    hsnCode: {
      type: String,
      required: [true, 'HSN code is required'],
      trim: true,
    },
    gstRate: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 28,
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'draft',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for search and discovery
ProductSchema.index({ title: 'text', description: 'text', materials: 'text' });
ProductSchema.index({ categoryId: 1, status: 1, isActive: 1 });
ProductSchema.index({ sellerId: 1, status: 1, isActive: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
