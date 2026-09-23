import { Router } from 'express';
import {
  login,
  customerSignup,
  customerLogin,
  sellerSignup,
  sellerLogin,
  adminLogin,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  verifyLoginOtp,
  resendLoginOtp,
  refreshToken,
  logout,
  getMe,
} from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  authLimiter,
  otpGenerateLimiter,
  otpVerifyLimiter,
} from '../middleware/rateLimiter.js';
import {
  customerSignupSchema,
  loginSchema,
  sellerSignupSchema,
  adminLoginSchema,
  verifyRegistrationOtpSchema,
  resendRegistrationOtpSchema,
  verifyLoginOtpSchema,
  resendLoginOtpSchema,
} from '../validators/auth.js';

const router = Router();

// Unified Login Endpoint (Step 1)
router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  login
);

// 2-Step Login OTP Verification (Step 2)
router.post(
  '/login/verify-otp',
  otpVerifyLimiter,
  validate({ body: verifyLoginOtpSchema }),
  verifyLoginOtp
);

// Resend Login OTP
router.post(
  '/login/resend-otp',
  otpGenerateLimiter,
  validate({ body: resendLoginOtpSchema }),
  resendLoginOtp
);

// Seller Register Alias
router.post(
  '/register',
  authLimiter,
  validate({ body: sellerSignupSchema }),
  sellerSignup
);

// Customer Auth
router.post(
  '/customer/signup',
  authLimiter,
  validate({ body: customerSignupSchema }),
  customerSignup
);

router.post(
  '/customer/login',
  authLimiter,
  validate({ body: loginSchema }),
  customerLogin
);

// Seller Auth
router.post(
  '/seller/signup',
  authLimiter,
  validate({ body: sellerSignupSchema }),
  sellerSignup
);

router.post(
  '/seller/login',
  authLimiter,
  validate({ body: loginSchema }),
  sellerLogin
);

// Registration Dual OTP Verification
router.post(
  '/verify-registration-otp',
  otpVerifyLimiter,
  validate({ body: verifyRegistrationOtpSchema }),
  verifyRegistrationOtp
);

router.post(
  '/resend-registration-otp',
  otpGenerateLimiter,
  validate({ body: resendRegistrationOtpSchema }),
  resendRegistrationOtp
);

// Admin Auth (Separate direct login)
router.post(
  '/admin/login',
  authLimiter,
  validate({ body: adminLoginSchema }),
  adminLogin
);

// Session & Token Management
router.post('/refresh', authLimiter, refreshToken);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);

export default router;
