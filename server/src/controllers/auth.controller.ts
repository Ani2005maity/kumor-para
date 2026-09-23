import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/User.js';
import { Seller } from '../models/Seller.js';
import { AuditLog } from '../models/AuditLog.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '../utils/token.js';
import { otpService } from '../services/otp/OtpService.js';
import { AppError } from '../middleware/errorHandler.js';
import { ApiResponse } from '@kumorpara/shared';

const BCRYPT_ROUNDS = 12;

function sanitizeUser(user: any) {
  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.passwordHash;
  delete userObj.__v;
  return userObj;
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Customer Signup: creates unverified account and dispatches Email OTP
 */
export async function customerSignup(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, password, phone, address } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isAccountActive || existingUser.emailVerified) {
        throw new AppError('An account with this email address already exists.', 409);
      }
      // If previous registration was unverified, allow resending verification OTP
      const otpData = await otpService.sendRegistrationOtps(existingUser);
      res.status(200).json({
        success: true,
        data: {
          userId: existingUser._id.toString(),
          emailMasked: otpData.emailMasked,
          ...(otpData.phoneMasked ? { phoneMasked: otpData.phoneMasked } : {}),
          emailVerified: existingUser.emailVerified,
          resendCooldownSeconds: otpData.resendCooldownSeconds,
          verificationRequired: true,
          user: sanitizeUser(existingUser),
        },
        message: 'Account registration already initiated. Please verify your Email verification code.',
      });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const addresses = address ? [{ ...address, isDefault: true }] : [];

    const user = await User.create({
      name,
      email,
      passwordHash,
      phone,
      role: 'customer',
      emailVerified: false,
      phoneVerified: false,
      isAccountActive: false,
      addresses,
    });

    const otpData = await otpService.sendRegistrationOtps(user);

    res.status(201).json({
      success: true,
      data: {
        userId: user._id.toString(),
        emailMasked: otpData.emailMasked,
        ...(otpData.phoneMasked ? { phoneMasked: otpData.phoneMasked } : {}),
        emailVerified: false,
        resendCooldownSeconds: otpData.resendCooldownSeconds,
        verificationRequired: true,
        user: sanitizeUser(user),
        ...(otpData.devEmailOtp ? { devEmailOtp: otpData.devEmailOtp } : {}),
      },
      message: 'Account created. Please verify your Email verification code to activate your account.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller Signup: creates unverified seller user + pending seller record, dispatches Email OTP
 */
export async function sellerSignup(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const {
      name,
      email,
      password,
      phone,
      shopName,
      legalName,
      bio,
      location,
      pickupAddress,
      gstin,
      panLast4,
      logoUrl,
      bannerUrl,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isAccountActive || existingUser.emailVerified) {
        throw new AppError('An account with this email address already exists.', 409);
      }
      const existingSeller = await Seller.findOne({ userId: existingUser._id });
      const otpData = await otpService.sendRegistrationOtps(existingUser);
      res.status(200).json({
        success: true,
        data: {
          userId: existingUser._id.toString(),
          seller: existingSeller,
          emailMasked: otpData.emailMasked,
          ...(otpData.phoneMasked ? { phoneMasked: otpData.phoneMasked } : {}),
          emailVerified: existingUser.emailVerified,
          resendCooldownSeconds: otpData.resendCooldownSeconds,
          verificationRequired: true,
          user: sanitizeUser(existingUser),
        },
        message: 'Artisan registration already initiated. Please verify your Email verification code.',
      });
      return;
    }

    let baseSlug = generateSlug(shopName);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await Seller.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({
      name,
      email,
      passwordHash,
      phone,
      role: 'seller',
      emailVerified: false,
      phoneVerified: false,
      isAccountActive: false,
      addresses: [{ ...pickupAddress, isDefault: true }],
    });

    const seller = await Seller.create({
      userId: user._id,
      shopName,
      slug: uniqueSlug,
      legalName: legalName || shopName,
      craftSpecialization: req.body.craftSpecialization || '',
      bio: bio || '',
      location: location || (pickupAddress ? `${pickupAddress.city}, ${pickupAddress.state}` : 'West Bengal'),
      pickupAddress,
      bankDetails: req.body.bankDetails?.accountNumber ? req.body.bankDetails : undefined,
      pan: req.body.pan || undefined,
      gstin: gstin || null,
      panLast4: panLast4 || (req.body.pan ? req.body.pan.slice(-4) : null),
      logoUrl: logoUrl || '',
      bannerUrl: bannerUrl || '',
      status: 'pending', // Requires admin moderation
      commissionRate: null,
    });

    // Record audit log
    await AuditLog.create({
      actorId: user._id,
      actorRole: 'seller',
      action: 'seller_registered',
      entityType: 'Seller',
      entityId: seller._id.toString(),
      metadata: {
        shopName: seller.shopName,
        legalName: seller.legalName,
        status: seller.status,
      },
      timestamp: new Date(),
      ip: req.ip,
    });

    const otpData = await otpService.sendRegistrationOtps(user);

    res.status(201).json({
      success: true,
      data: {
        userId: user._id.toString(),
        sellerId: seller._id.toString(),
        emailMasked: otpData.emailMasked,
        ...(otpData.phoneMasked ? { phoneMasked: otpData.phoneMasked } : {}),
        emailVerified: false,
        resendCooldownSeconds: otpData.resendCooldownSeconds,
        verificationRequired: true,
        user: sanitizeUser(user),
        seller,
        ...(otpData.devEmailOtp ? { devEmailOtp: otpData.devEmailOtp } : {}),
      },
      message: 'Seller application submitted. Please verify your Email code to complete your submission.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Verify Registration OTP (Email OTP)
 */
export async function verifyRegistrationOtp(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, channel, otp } = req.body;

    const result = await otpService.verifyRegistrationOtp({
      userId,
      channel: channel || 'email',
      otp,
    });

    let seller = null;
    if (result.user.role === 'seller') {
      seller = await Seller.findOne({ userId: result.user._id });
    }

    // Activate session and set cookies on successful email verification
    if (result.isFullyVerified) {
      const accessToken = generateAccessToken({
        userId: result.user._id.toString(),
        email: result.user.email,
        role: result.user.role,
      });

      const refreshToken = generateRefreshToken({
        userId: result.user._id.toString(),
      });

      setAuthCookies(res, accessToken, refreshToken);
    }

    res.json({
      success: true,
      data: {
        isFullyVerified: result.isFullyVerified,
        channelVerified: result.channelVerified,
        emailVerified: result.emailVerified,
        user: sanitizeUser(result.user),
        ...(seller ? { seller } : {}),
      },
      message: 'Account successfully verified and activated!',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resend Registration OTP
 */
export async function resendRegistrationOtp(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { userId, channel } = req.body;

    const result = await otpService.resendRegistrationOtp({
      userId,
      channel: channel || 'email',
    });

    res.json({
      success: true,
      data: {
        channel: result.channel,
        maskedTarget: result.maskedTarget,
        resendCooldownSeconds: result.resendCooldownSeconds,
        ...(result.devOtp ? { devOtp: result.devOtp } : {}),
      },
      message: `Fresh verification code sent to ${result.maskedTarget}`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Step 1: Login with Email & Password.
 * Admin logs in directly. Customers and sellers receive a 2FA Login OTP.
 */
export async function login(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid email or password.', 401);
    }

    // Admin and pre-verified Demo accounts log in directly without 2FA OTP
    if (user.role === 'admin' || user.isDemoAccount) {
      let seller = null;
      if (user.role === 'seller') {
        seller = await Seller.findOne({ userId: user._id });
      }

      const accessToken = generateAccessToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken({
        userId: user._id.toString(),
      });

      setAuthCookies(res, accessToken, refreshToken);

      res.json({
        success: true,
        data: {
          user: sanitizeUser(user),
          ...(seller ? { seller } : {}),
        },
        message: user.role === 'admin' ? 'Admin login successful' : 'Login successful',
      });
      return;
    }

    // Check account verification status
    if (!user.emailVerified) {
      // Re-send registration OTP for unverified accounts
      const otpData = await otpService.sendRegistrationOtps(user);
      res.status(403).json({
        success: false,
        error: 'Account verification incomplete. Please verify your Email verification code.',
        data: {
          userId: user._id.toString(),
          verificationRequired: true,
          emailVerified: user.emailVerified,
          emailMasked: otpData.emailMasked,
          ...(otpData.phoneMasked ? { phoneMasked: otpData.phoneMasked } : {}),
          resendCooldownSeconds: otpData.resendCooldownSeconds,
          ...(otpData.devEmailOtp ? { devEmailOtp: otpData.devEmailOtp } : {}),
        },
      });
      return;
    }

    // Initiate 2-Step OTP Login to Email
    const mfaData = await otpService.sendLoginOtp(user, 'email');

    res.json({
      success: true,
      data: {
        mfaRequired: true,
        tempToken: mfaData.tempToken,
        channel: mfaData.channel,
        maskedTarget: mfaData.maskedTarget,
        resendCooldownSeconds: mfaData.resendCooldownSeconds,
        ...(mfaData.devOtp ? { devOtp: mfaData.devOtp } : {}),
      },
      message: `Verification code sent to your registered email (${mfaData.maskedTarget})`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Step 1 Customer Login (Alias with role verification)
 */
export async function customerLogin(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.role !== 'customer') {
      throw new AppError('Invalid email or password.', 401);
    }
    return login(req, res, next);
  } catch (error) {
    next(error);
  }
}

/**
 * Step 1 Seller Login (Alias with role verification)
 */
export async function sellerLogin(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.role !== 'seller') {
      throw new AppError('Invalid seller email or password.', 401);
    }
    return login(req, res, next);
  } catch (error) {
    next(error);
  }
}

/**
 * Step 2: Verify Login OTP & Issue Session Tokens
 */
export async function verifyLoginOtp(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { tempToken, otp } = req.body;

    const { user, seller } = await otpService.verifyLoginOtp(tempToken, otp);

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
    });

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        ...(seller ? { seller } : {}),
      },
      message: 'Login successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Resend Login OTP
 */
export async function resendLoginOtp(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { tempToken, channel } = req.body;

    const result = await otpService.resendLoginOtp(tempToken, channel);

    res.json({
      success: true,
      data: {
        channel: result.channel,
        maskedTarget: result.maskedTarget,
        resendCooldownSeconds: result.resendCooldownSeconds,
      },
      message: `Fresh verification code sent to ${result.maskedTarget}`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin Login
 */
export async function adminLogin(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.role !== 'admin') {
      throw new AppError('Invalid administrator credentials.', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid administrator credentials.', 401);
    }

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
    });

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
      },
      message: 'Admin login successful',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh Token Rotation
 */
export async function refreshToken(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const oldRefreshToken = req.cookies?.refreshToken;

    if (!oldRefreshToken) {
      throw new AppError('Refresh token missing. Please log in again.', 401);
    }

    const payload = verifyRefreshToken(oldRefreshToken);
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new AppError('User session expired or user not found.', 401);
    }

    const newAccessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const newRefreshToken = generateRefreshToken({
      userId: user._id.toString(),
    });

    setAuthCookies(res, newAccessToken, newRefreshToken);

    let seller = null;
    if (user.role === 'seller') {
      seller = await Seller.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(user),
        ...(seller ? { seller } : {}),
      },
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout
 */
export async function logout(
  _req: Request,
  res: Response<ApiResponse>
): Promise<void> {
  clearAuthCookies(res);
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
}

/**
 * Get Current Authenticated User (and Seller profile if role is seller)
 */
export async function getMe(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Not authenticated', 401);
    }

    let seller = null;
    if (req.user.role === 'seller') {
      seller = await Seller.findOne({ userId: req.user._id });
    }

    res.json({
      success: true,
      data: {
        user: sanitizeUser(req.user),
        ...(seller ? { seller } : {}),
      },
    });
  } catch (error) {
    next(error);
  }
}
