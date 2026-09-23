import { z } from 'zod';
import { AddressInputSchema } from './auth.js';

export const updateSellerProfileSchema = z.object({
  shopName: z.string().min(2, 'Shop name must be at least 2 characters').trim().optional(),
  bio: z.string().optional(),
  location: z.string().min(2, 'Location is required').trim().optional(),
  pickupAddress: AddressInputSchema.optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
  bannerUrl: z.string().url().optional().or(z.literal('')),
});

export const updateSellerStatusSchema = z
  .object({
    status: z.enum(['approved', 'rejected', 'suspended']),
    rejectionReason: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.status === 'rejected') {
        return typeof data.rejectionReason === 'string' && data.rejectionReason.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Rejection reason is required when rejecting a seller application',
      path: ['rejectionReason'],
    }
  );

export const updateSellerCommissionSchema = z.object({
  commissionRate: z
    .number()
    .min(0, 'Commission rate cannot be negative')
    .max(100, 'Commission rate cannot exceed 100%')
    .nullable(),
});

export const sellerQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  status: z.enum(['pending', 'approved', 'rejected', 'suspended']).optional(),
  search: z.string().optional(),
});
