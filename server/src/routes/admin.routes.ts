import { Router } from 'express';
import {
  getOverview,
  getAuditLogs,
  getSettings,
  updateSettings,
} from '../controllers/admin.controller.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// All routes require authenticated Admin
router.use(requireAuth, requireAdmin);

router.get('/overview', getOverview);
router.get('/audit-logs', getAuditLogs);
router.get('/settings', getSettings);
router.put('/settings', writeLimiter, updateSettings);

export default router;
