import { z } from 'zod';
import { AddressInputSchema } from './auth.js';

export const checkoutItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  qty: z.number().int('Quantity must be an integer').min(1, 'Quantity must be at least 1'),
  customisationNote: z.string().max(300, 'Customisation note too long').optional().default(''),
});

export const checkoutSchema = z.object({
  shippingAddress: AddressInputSchema,
  billingAddress: AddressInputSchema.optional(),
  items: z.array(checkoutItemSchema).min(1, 'Cart must contain at least one item'),
});

export const updateSellerOrderStatusSchema = z
  .object({
    status: z.enum([
      'accepted',
      'preparing',
      'ready_for_pickup',
      'shipped',
      'delivered',
      'cancelled',
    ]),
    courierName: z.string().trim().optional().nullable(),
    trackingRef: z.string().trim().optional().nullable(),
    courierInfo: z
      .object({
        courier: z.string().optional(),
        trackingNumber: z.string().optional(),
        shippedAt: z.string().optional(),
      })
      .optional()
      .nullable(),
    statusNote: z.string().trim().optional(),
    reason: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (data.status === 'shipped') {
        // When shipping, courier and tracking info can optionally be provided or updated
        return true;
      }
      return true;
    },
    {
      message: 'Invalid status update',
    }
  );

export const orderQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  search: z.string().optional(),
});
