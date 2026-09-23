import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import categoryRoutes from './routes/category.routes.js';
import productRoutes from './routes/product.routes.js';
import sellerRoutes from './routes/seller.routes.js';
import orderRoutes from './routes/order.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// Security & Middleware
const rawOrigins = [
  process.env.CORS_ORIGIN_CUSTOMER,
  process.env.CORS_ORIGIN_SELLER,
  process.env.CORS_ORIGIN_ADMIN,
  process.env.CLIENT_URL,
  process.env.ALLOWED_ORIGINS,
]
  .filter(Boolean)
  .flatMap((o) => (o as string).split(',').map((s) => s.trim()));

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
];

const allowedOrigins = rawOrigins.length > 0
  ? Array.from(new Set([...rawOrigins, ...defaultOrigins]))
  : defaultOrigins;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Kumor Para Marketplace API',
    },
  });
});

// Mount Domain Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

// Centralized Error Handler (Never leaks stack traces)
app.use(errorHandler);

export async function startServer() {
  await connectDB();
  return app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Kumor Para Server running on port ${PORT}`);
  });
}

// Auto-start server only when executed directly, not when imported in test runners
const isDirectExecution =
  process.argv[1] &&
  (process.argv[1].endsWith('server.ts') || process.argv[1].endsWith('server.js'));

if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export default app;
