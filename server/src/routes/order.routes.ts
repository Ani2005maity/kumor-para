import { Router } from 'express';
import {
  checkout,
  getMyOrders,
  getMyOrderById,
  getSellerOrders,
  getSellerOrderById,
  updateSellerOrderStatus,
  getAdminOrders,
  getAdminOrderById,
} from '../controllers/order.controller.js';
import { requireAuth, requireSeller, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { checkoutSchema, updateSellerOrderStatusSchema } from '../validators/order.js';

const router = Router();

// -------------------------------------------------------------
// Customer Order & Checkout Routes
// -------------------------------------------------------------
router.post('/checkout', requireAuth, writeLimiter, validate({ body: checkoutSchema }), checkout);
router.get('/my-orders', requireAuth, getMyOrders);
router.get('/my-orders/:id', requireAuth, getMyOrderById);

// -------------------------------------------------------------
// Seller Order Fulfillment Pipeline Routes
// -------------------------------------------------------------
router.get('/seller/list', requireAuth, requireSeller, getSellerOrders);
router.get('/seller/mine', requireAuth, requireSeller, getSellerOrders);
router.get('/seller', requireAuth, requireSeller, getSellerOrders);
router.get('/seller/item/:id', requireAuth, requireSeller, getSellerOrderById);
router.patch(
  '/seller/item/:id/status',
  requireAuth,
  requireSeller,
  writeLimiter,
  validate({ body: updateSellerOrderStatusSchema }),
  updateSellerOrderStatus
);

// -------------------------------------------------------------
// Admin Order Oversight Routes
// -------------------------------------------------------------
router.get('/admin/list', requireAuth, requireAdmin, getAdminOrders);
router.get('/admin/detail/:id', requireAuth, requireAdmin, getAdminOrderById);

export default router;
