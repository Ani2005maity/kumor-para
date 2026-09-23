import mongoose, { Document, Schema, Types } from 'mongoose';

export type OtpTargetType = 'email' | 'phone';
export type OtpPurpose = 'registration' | 'login' | 'password_reset';
export type OtpStatus = 'pending' | 'verified' | 'expired' | 'exhausted';

export interface IOtpVerification extends Document {
  _id: Types.ObjectId;
  target: string; // Lowercase email or E.164 phone (+91...)
  targetType: OtpTargetType;
  purpose: OtpPurpose;
  userId?: Types.ObjectId | null;
  otpHash: string; // SHA-256 hash of OTP + secret pepper
  expiresAt: Date; // 5 minutes TTL
  attempts: number; // Increment on wrong guesses
  maxAttempts: number; // Default 5
  status: OtpStatus;
  cooldownUntil: Date; // 60s cooldown window before next resend
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const OtpVerificationSchema = new Schema<IOtpVerification>(
  {
    target: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['email', 'phone'],
      required: true,
      index: true,
    },
    purpose: {
      type: String,
      enum: ['registration', 'login', 'password_reset'],
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxAttempts: {
      type: Number,
      default: 5,
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'expired', 'exhausted'],
      default: 'pending',
      index: true,
    },
    cooldownUntil: {
      type: Date,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for active pending OTP lookup
OtpVerificationSchema.index({ target: 1, purpose: 1, status: 1 });

// TTL index for automatic document cleanup after 24 hours
OtpVerificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

export const OtpVerification = mongoose.model<IOtpVerification>(
  'OtpVerification',
  OtpVerificationSchema
);
