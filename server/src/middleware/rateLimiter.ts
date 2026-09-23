import rateLimit from 'express-rate-limit';

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 10000 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// Write operations limiter (mutations, checkouts, creation)
export const writeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many write requests. Please try again later.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// Strict limiter for authentication attempts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 20, // Limit each IP to 20 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// Strict limiter for OTP generation/resend (5 requests per 10 minutes per IP)
export const otpGenerateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many OTP requests from this IP. Please try again after 10 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// Limiter for OTP verification attempts (15 attempts per 10 minutes per IP)
export const otpVerifyLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 10000 : 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many OTP verification attempts. Please try again later.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

