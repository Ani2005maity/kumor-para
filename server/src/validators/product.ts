import { z } from 'zod';

const DimensionSchema = z.object({
  l: z.number().min(0, 'Length cannot be negative'),
  w: z.number().min(0, 'Width cannot be negative'),
  h: z.number().min(0, 'Height cannot be negative'),
  unit: z.enum(['cm', 'inch', 'mm']).default('cm'),
});

const ImageSchema = z.object({
  url: z.string().url('Invalid image URL'),
  publicId: z.string().optional().default(''),
  alt: z.string().optional().default(''),
});

export const createProductSchema = z
  .object({
    title: z.string().min(2, 'Product title must be at least 2 characters').trim(),
    categoryId: z.string().min(1, 'Category is required'),
    description: z.string().optional().default(''),
    price: z.number().int('Price must be an integer in paise').min(0, 'Price cannot be negative'),
    discountPrice: z
      .number()
      .int('Discount price must be an integer in paise')
      .min(0)
      .optional()
      .nullable(),
    compareAtPrice: z.number().int().optional().nullable(),
    stock: z.number().int('Stock must be an integer').min(0, 'Stock cannot be negative').default(0),
    fulfilmentType: z.enum(['ready_stock', 'made_to_order']).default('ready_stock'),
    productionDays: z.number().min(0).default(0),
    leadTimeDays: z.number().min(0).optional(),
    customisationAvailable: z.boolean().default(false),
    isCustomisable: z.boolean().optional(),
    customisationPrompt: z.string().optional().nullable(),
    sku: z.string().optional(),
    materials: z.array(z.string().trim()).default([]),
    dimensions: DimensionSchema.default({ l: 0, w: 0, h: 0, unit: 'cm' }),
    colors: z.array(z.string().trim()).default([]),
    images: z.array(ImageSchema).min(1, 'At least one product image is required'),
    hsnCode: z.string().trim().optional().default('6912'),
    gstRate: z.number().min(0).max(28).default(0),
    status: z.enum(['draft', 'pending']).default('draft'),
  })
  .transform((data) => {
    return {
      ...data,
      customisationAvailable: data.customisationAvailable || Boolean(data.isCustomisable),
      productionDays:
        data.fulfilmentType === 'made_to_order'
          ? data.productionDays || data.leadTimeDays || 3
          : 0,
    };
  })
  .refine(
    (data) => {
      if (data.fulfilmentType === 'made_to_order') {
        return typeof data.productionDays === 'number' && data.productionDays > 0;
      }
      return true;
    },
    {
      message: 'Production days must be greater than 0 for made-to-order products',
      path: ['productionDays'],
    }
  );


export const updateProductSchema = z
  .object({
    title: z.string().min(2).trim().optional(),
    categoryId: z.string().optional(),
    description: z.string().trim().optional(),
    price: z.number().int('Price must be an integer in paise').min(0).optional(),
    discountPrice: z
      .number()
      .int('Discount price must be an integer in paise')
      .min(0)
      .optional()
      .nullable(),
    stock: z.number().int('Stock must be an integer').min(0).optional(),
    fulfilmentType: z.enum(['ready_stock', 'made_to_order']).optional(),
    productionDays: z.number().min(0).optional(),
    customisationAvailable: z.boolean().optional(),
    customisationPrompt: z.string().optional().nullable(),
    materials: z.array(z.string().trim()).optional(),
    dimensions: DimensionSchema.optional(),
    colors: z.array(z.string().trim()).optional(),
    images: z.array(ImageSchema).min(1).optional(),
    hsnCode: z.string().min(2).trim().optional(),
    gstRate: z.number().min(0).max(28).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.fulfilmentType === 'made_to_order' && data.productionDays !== undefined) {
        return data.productionDays > 0;
      }
      return true;
    },
    {
      message: 'Production days must be greater than 0 for made-to-order products',
      path: ['productionDays'],
    }
  );

export const updateProductStockSchema = z.object({
  stock: z.number().int('Stock must be an integer').min(0, 'Stock cannot be negative'),
  price: z.number().int('Price must be an integer in paise').min(0).optional(),
  discountPrice: z.number().int().min(0).optional().nullable(),
});

export const updateProductStatusSchema = z
  .object({
    status: z.enum(['approved', 'rejected']),
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
      message: 'Rejection reason is required when rejecting a product',
      path: ['rejectionReason'],
    }
  );

export const productQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
  category: z.string().optional(),
  seller: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
  maxPrice: z.string().regex(/^\d+$/).transform(Number).optional(),
  material: z.string().optional(),
  rating: z.string().regex(/^\d+(\.\d+)?$/).transform(Number).optional(),
  fulfilmentType: z.enum(['ready_stock', 'made_to_order']).optional(),
  inStock: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  sortBy: z.enum(['newest', 'price_asc', 'price_desc', 'rating', 'popular']).optional().default('newest'),
  status: z.enum(['draft', 'pending', 'approved', 'rejected']).optional(),
});
