import { Router } from 'express';
import { generateUploadSignature } from '../services/cloudinary.service.js';
import { requireAuth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/signature', requireAuth, writeLimiter, (req, res) => {
  const folder = (req.query.folder as string) || 'kumorpara/products';
  const signData = generateUploadSignature(folder);
  res.json({
    success: true,
    data: signData,
  });
});

export default router;
