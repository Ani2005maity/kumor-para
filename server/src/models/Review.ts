import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReview extends Document {
  _id: Types.ObjectId;
  productId: Types.ObjectId;
  sellerId: Types.ObjectId;
  customerId: Types.ObjectId;
  sellerOrderId: Types.ObjectId;
  rating: number; // 1 - 5
  text: string;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: 'Seller',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sellerOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'SellerOrder',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: [true, 'Review text is required'],
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate review per customer per product for the same order
ReviewSchema.index({ customerId: 1, sellerOrderId: 1, productId: 1 }, { unique: true });

export const Review = mongoose.model<IReview>('Review', ReviewSchema);
