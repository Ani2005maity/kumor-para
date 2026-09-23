import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters').trim(),
  slug: z.string().min(2, 'Slug must be at least 2 characters').toLowerCase().trim().optional(),
  parentId: z.string().optional().nullable(),
  iconKey: z.string().default('sparkles'),
  defaultCommissionRate: z.number().min(0).max(100).default(10),
  hsnCode: z.string().optional().nullable(),
  gstRate: z.number().min(0).max(28).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).trim().optional(),
  slug: z.string().min(2).toLowerCase().trim().optional(),
  parentId: z.string().optional().nullable(),
  iconKey: z.string().optional(),
  defaultCommissionRate: z.number().min(0).max(100).optional(),
  hsnCode: z.string().optional().nullable(),
  gstRate: z.number().min(0).max(28).optional().nullable(),
  isActive: z.boolean().optional(),
});
