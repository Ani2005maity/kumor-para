import { Request, Response, NextFunction } from 'express';
import { User, IUser } from '../models/User.js';
import { Seller, ISeller } from '../models/Seller.js';
import { Settings } from '../models/Settings.js';
import { verifyAccessToken } from '../utils/token.js';
import { AppError } from './errorHandler.js';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
      seller?: ISeller;
    }
  }
}

/**
 * Middleware to authenticate requests via httpOnly cookie or Bearer header.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new AppError('User account not found or has been removed.', 401);
    }

    req.user = user;

    if (user.role === 'seller') {
      const seller = await Seller.findOne({ userId: user._id });
      if (seller) {
        req.seller = seller;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware ensuring the authenticated user has the 'seller' role
 * and loads their Seller profile onto req.seller.
 */
export async function requireSeller(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role !== 'seller') {
      throw new AppError('Forbidden: Seller access required', 403);
    }

    const seller = await Seller.findOne({ userId: req.user._id });
    if (!seller) {
      throw new AppError('Seller profile not found for this account', 403);
    }

    req.seller = seller;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware ensuring the seller is approved before allowing mutating catalog operations.
 */
export async function requireApprovedSeller(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.seller) {
      throw new AppError('Seller profile not found', 403);
    }

    if (req.seller.status !== 'approved') {
      throw new AppError(
        `Seller account status is '${req.seller.status}'. Action only allowed for approved sellers.`,
        403
      );
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware ensuring the authenticated user has the 'admin' role.
 * Includes support/scaffolding for TOTP 2FA.
 */
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError('Authentication required', 401);
    }

    if (req.user.role !== 'admin') {
      throw new AppError('Forbidden: Administrator access required', 403);
    }

    // Check if TOTP 2FA is enforced in platform Settings
    const settings = await Settings.findOne();
    if (settings?.enableTotp2FA) {
      const totpHeader = req.headers['x-admin-totp'];
      if (!totpHeader) {
        throw new AppError('Two-factor authentication (2FA) verification required', 403, {
          requires2FA: true,
        });
      }
      // Scaffolding for TOTP verification
      if (totpHeader !== '000000' && process.env.NODE_ENV !== 'production') {
        // Dev accepted code
      }
    }

    next();
  } catch (error) {
    next(error);
  }
}
