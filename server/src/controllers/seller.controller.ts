import { Request, Response, NextFunction } from 'express';
import { Seller } from '../models/Seller.js';
import { Product } from '../models/Product.js';
import { AuditLog } from '../models/AuditLog.js';
import { AppError } from '../middleware/errorHandler.js';
import { ApiResponse } from '@kumorpara/shared';

/**
 * Public: Get approved sellers directory
 */
export async function getSellers(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { status: 'approved' };
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filter.$or = [{ shopName: searchRegex }, { location: searchRegex }, { bio: searchRegex }];
    }

    const [sellers, total] = await Promise.all([
      Seller.find(filter)
        .select('shopName slug location bio logoUrl bannerUrl rating totalSales')
        .sort({ rating: -1, totalSales: -1 })
        .skip(skip)
        .limit(limit),
      Seller.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        sellers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: Get seller public storefront by slug (with approved products)
 */
export async function getSellerBySlug(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const seller = await Seller.findOne({ slug, status: 'approved' }).select(
      'shopName slug legalName location bio logoUrl bannerUrl rating totalSales createdAt'
    );

    if (!seller) {
      throw new AppError('Seller profile not found', 404);
    }

    const products = await Product.find({
      sellerId: seller._id,
      status: 'approved',
      isActive: true,
    })
      .populate('categoryId', 'name slug')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        seller,
        products,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Get own profile details
 */
export async function getSellerProfile(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const seller = await Seller.findById(req.seller!._id).populate('userId', 'name email phone');
    res.json({
      success: true,
      data: {
        seller,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Update own profile details
 */
export async function updateSellerProfile(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const seller = req.seller!;
    const { shopName, bio, location, pickupAddress, logoUrl, bannerUrl } = req.body;

    if (shopName) seller.shopName = shopName;
    if (bio !== undefined) seller.bio = bio;
    if (location) seller.location = location;
    if (pickupAddress) seller.pickupAddress = pickupAddress;
    if (logoUrl !== undefined) seller.logoUrl = logoUrl;
    if (bannerUrl !== undefined) seller.bannerUrl = bannerUrl;

    await seller.save();

    res.json({
      success: true,
      data: {
        seller,
      },
      message: 'Seller profile updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Get all sellers (approval queue, active, suspended)
 */
export async function getAdminSellers(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filter.$or = [{ shopName: searchRegex }, { legalName: searchRegex }, { location: searchRegex }];
    }

    const [sellers, total] = await Promise.all([
      Seller.find(filter)
        .populate('userId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Seller.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        sellers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Get single seller by ID
 */
export async function getAdminSellerById(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const seller = await Seller.findById(req.params.id).populate('userId', 'name email phone createdAt');
    if (!seller) {
      throw new AppError('Seller not found', 404);
    }

    const productStats = await Product.aggregate([
      { $match: { sellerId: seller._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        seller,
        productStats,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Update seller approval / suspension status (with Audit Log)
 */
export async function updateSellerStatus(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const seller = await Seller.findById(id);
    if (!seller) {
      throw new AppError('Seller not found', 404);
    }

    const previousStatus = seller.status;
    seller.status = status;
    seller.rejectionReason = status === 'rejected' ? rejectionReason : null;
    await seller.save();

    // Record AuditLog
    await AuditLog.create({
      actorId: req.user!._id,
      actorRole: req.user!.role,
      action:
        status === 'approved'
          ? 'seller_approved'
          : status === 'rejected'
          ? 'seller_rejected'
          : 'seller_suspended',
      entityType: 'Seller',
      entityId: seller._id.toString(),
      metadata: {
        shopName: seller.shopName,
        previousStatus,
        newStatus: status,
        rejectionReason: seller.rejectionReason,
      },
      timestamp: new Date(),
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        seller,
      },
      message: `Seller account status changed to '${status}'.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Update seller custom commission rate override (with Audit Log)
 */
export async function updateSellerCommission(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;

    const seller = await Seller.findById(id);
    if (!seller) {
      throw new AppError('Seller not found', 404);
    }

    const previousRate = seller.commissionRate;
    seller.commissionRate = commissionRate;
    await seller.save();

    // Record AuditLog
    await AuditLog.create({
      actorId: req.user!._id,
      actorRole: req.user!.role,
      action: 'seller_commission_updated',
      entityType: 'Seller',
      entityId: seller._id.toString(),
      metadata: {
        shopName: seller.shopName,
        previousRate,
        newRate: commissionRate,
      },
      timestamp: new Date(),
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        seller,
      },
      message: `Seller commission rate set to ${commissionRate != null ? `${commissionRate}%` : 'category/platform default'}.`,
    });
  } catch (error) {
    next(error);
  }
}
