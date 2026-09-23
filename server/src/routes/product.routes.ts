import { Router } from 'express';
import {
  getProducts,
  getFeaturedProducts,
  getProductBySlug,
  getSellerProducts,
  getSellerProductById,
  createProduct,
  updateProduct,
  updateProductStock,
  submitProductForApproval,
  deleteProduct,
  getAdminProducts,
  updateProductStatus,
} from '../controllers/product.controller.js';
import { requireAuth, requireSeller, requireApprovedSeller, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import {
  createProductSchema,
  updateProductSchema,
  updateProductStockSchema,
  updateProductStatusSchema,
} from '../validators/product.js';

const router = Router();

// -------------------------------------------------------------
// Public Catalog Routes
// -------------------------------------------------------------
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/:slug', getProductBySlug);

// -------------------------------------------------------------
// Seller Inventory & Catalog Management Routes
// -------------------------------------------------------------
router.get('/seller/list', requireAuth, requireSeller, getSellerProducts);
router.get('/seller/mine', requireAuth, requireSeller, getSellerProducts);
router.get('/seller/item/:id', requireAuth, requireSeller, getSellerProductById);

router.post(
  '/seller',
  requireAuth,
  requireSeller,
  requireApprovedSeller,
  writeLimiter,
  validate({ body: createProductSchema }),
  createProduct
);

router.post(
  '/',
  requireAuth,
  requireSeller,
  requireApprovedSeller,
  writeLimiter,
  validate({ body: createProductSchema }),
  createProduct
);

router.put(
  '/seller/:id',
  requireAuth,
  requireSeller,
  requireApprovedSeller,
  writeLimiter,
  validate({ body: updateProductSchema }),
  updateProduct
);

router.put(
  '/:id',
  requireAuth,
  requireSeller,
  requireApprovedSeller,
  writeLimiter,
  validate({ body: updateProductSchema }),
  updateProduct
);

router.patch(
  '/seller/:id/stock',
  requireAuth,
  requireSeller,
  requireApprovedSeller,
  writeLimiter,
  validate({ body: updateProductStockSchema }),
  updateProductStock
);

router.patch(
  '/:id/stock',
  requireAuth,
  requireSeller,
  requireApprovedSeller,
  writeLimiter,
  validate({ body: updateProductStockSchema }),
  updateProductStock
);

router.patch(
  '/seller/:id/submit',
  requireAuth,
  requireSeller,
  requireApprovedSeller,
  writeLimiter,
  submitProductForApproval
);

router.patch(
  '/:id/submit',
  requireAuth,
  requireSeller,
  requireApprovedSeller,
  writeLimiter,
  submitProductForApproval
);

router.delete('/seller/:id', requireAuth, requireSeller, writeLimiter, deleteProduct);
router.delete('/:id', requireAuth, requireSeller, writeLimiter, deleteProduct);


// -------------------------------------------------------------
// Admin Product Moderation Routes
// -------------------------------------------------------------
router.get('/admin/list', requireAuth, requireAdmin, getAdminProducts);
router.patch(
  '/admin/:id/status',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ body: updateProductStatusSchema }),
  updateProductStatus
);

export default router;
