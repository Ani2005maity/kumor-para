import { Router } from 'express';
import {
  getCategories,
  getCategoryBySlug,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/category.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.js';

const router = Router();

// Public routes
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Admin routes
router.get('/admin/all', requireAuth, requireAdmin, getAllCategoriesAdmin);
router.post(
  '/',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ body: createCategorySchema }),
  createCategory
);
router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  writeLimiter,
  validate({ body: updateCategorySchema }),
  updateCategory
);
router.delete('/:id', requireAuth, requireAdmin, writeLimiter, deleteCategory);

export default router;
