import { Router } from 'express';
import {
  getSellers,
  getSellerBySlug,
  getSellerProfile,
  updateSellerProfile,
  getAdminSellers,
  getAdminSellerById,
  updateSellerStatus,
  updateSellerCommission,
} from '../controllers/seller.controller.js';
import { requireAuth, requireSeller, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import {
  updateSellerProfileSchema,
  updateSellerStatusSchema,
  updateSellerCommissionSchema,
} from '../validators/seller.js';

const router = Router();

// -------------------------------------------------------------
// Public Seller Directory & Storefront
// -------------------------------------------------------------
router.get('/', getSellers);
router.get('/:slug', getSellerBySlug);

// -------------------------------------------------------------
// Seller Profile Self-Management
// -------------------------------------------------------------
router.get('/profile/me', requireAuth, requireSeller, getSellerProfile);
router.put(
  '/profile/me',
  requireAuth,
  requireSeller,
  writeLimiter,
  validate({ body: updateSellerProfileSchema }),
  updateSellerProfile
);

// -------------------------------------------------------------
// Admin Seller Verification & Commission Management
// -------------------------------------------------------------
router.get('/admin/list', requireAuth, requireAdmin, getAdminSellers);
router.get('/admin/detail/:id', requireAuth, requireAdmin, getAdminSellerById);

router.patch(
  '/admin/:id/status',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ body: updateSellerStatusSchema }),
  updateSellerStatus
);

router.patch(
  '/admin/:id/commission',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ body: updateSellerCommissionSchema }),
  updateSellerCommission
);

export default router;
