import { z } from 'zod';

const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
const pincodeRegex = /^[1-9][0-9]{5}$/; // 6-digit Indian PIN code

export const AddressInputSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Valid phone number required'),
  street: z.string().min(3, 'Street address is required'),
  landmark: z.string().optional(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  stateCode: z.string().min(2).max(2, '2-digit state code required (e.g., 19 for WB)'),
  pincode: z.string().regex(pincodeRegex, 'Valid 6-digit Indian PIN code required'),
  isDefault: z.boolean().optional().default(false),
});

export const customerSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().min(10, 'Valid phone number is required'),
  address: AddressInputSchema.optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const sellerSignupSchema = z.object({
  name: z.string().min(2, 'Contact person name is required'),
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  shopName: z.string().min(2, 'Shop name is required'),
  legalName: z.string().optional().or(z.literal('')),
  craftSpecialization: z.string().optional().or(z.literal('')),
  bio: z.string().optional().default(''),
  location: z.string().optional().or(z.literal('')),
  pickupAddress: AddressInputSchema,
  gstin: z
    .string()
    .trim()
    .transform((val) => (val && val.length > 0 ? val.toUpperCase() : undefined))
    .optional()
    .nullable(),
  pan: z.string().optional().or(z.literal('')),
  panLast4: z
    .string()
    .trim()
    .transform((val) => (val && val.length > 0 ? val.toUpperCase() : undefined))
    .optional()
    .nullable(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  bannerUrl: z.string().url().optional().or(z.literal('')),
  bankDetails: z
    .object({
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      accountHolderName: z.string().optional(),
    })
    .optional(),
});


export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
  totpToken: z.string().optional(),
});

export const verifyRegistrationOtpSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  channel: z.enum(['email', 'phone']).optional().default('email'),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code'),
});

export const resendRegistrationOtpSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  channel: z.enum(['email', 'phone']).optional().default('email'),
});

export const verifyLoginOtpSchema = z.object({
  tempToken: z.string().min(1, 'Temporary authentication token is required'),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be a 6-digit numeric code'),
});

export const resendLoginOtpSchema = z.object({
  tempToken: z.string().min(1, 'Temporary authentication token is required'),
  channel: z.enum(['email', 'phone']).optional().default('email'),
});

