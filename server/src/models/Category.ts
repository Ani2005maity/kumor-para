import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategory extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  parentId?: Types.ObjectId | null;
  iconKey: string;
  defaultCommissionRate: number; // e.g. 10 for 10%
  hsnCode?: string | null;
  gstRate?: number | null; // e.g. 5, 12, 18
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
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
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    iconKey: {
      type: String,
      default: 'sparkles',
      trim: true,
    },
    defaultCommissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },
    hsnCode: {
      type: String,
      default: null,
      trim: true,
    },
    gstRate: {
      type: Number,
      default: null,
      min: 0,
      max: 28,
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

export const Category = mongoose.model<ICategory>('Category', CategorySchema);
