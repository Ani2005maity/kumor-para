import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/Order.js';
import { SellerOrder } from '../models/SellerOrder.js';
import { Seller } from '../models/Seller.js';
import { Product } from '../models/Product.js';
import { Settings } from '../models/Settings.js';
import { AuditLog } from '../models/AuditLog.js';
import { ApiResponse } from '@kumorpara/shared';

/**
 * Admin: Get high-level platform KPIs & operational metrics
 */
export async function getOverview(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const [
      totalOrders,
      sellerOrders,
      approvedSellersCount,
      pendingSellersCount,
      approvedProductsCount,
      pendingProductsCount,
      recentAuditLogs,
    ] = await Promise.all([
      Order.countDocuments(),
      SellerOrder.find({ status: { $ne: 'cancelled' } }).select('subtotal commissionAmount payoutAmount status'),
      Seller.countDocuments({ status: 'approved' }),
      Seller.countDocuments({ status: 'pending' }),
      Product.countDocuments({ status: 'approved', isActive: true }),
      Product.countDocuments({ status: 'pending', isActive: true }),
      AuditLog.find().sort({ timestamp: -1 }).limit(6).populate('actorId', 'name email role'),
    ]);

    // Aggregate Gross GMV and Platform Commission Earned in integer paise
    let totalGrossGMV = 0;
    let totalCommissionEarned = 0;
    let totalArtisanPayouts = 0;

    for (const so of sellerOrders) {
      totalGrossGMV += so.subtotal || 0;
      totalCommissionEarned += so.commissionAmount || 0;
      totalArtisanPayouts += so.sellerPayout || 0;
    }

    res.json({
      success: true,
      data: {
        kpis: {
          totalGrossGMV,
          totalCommissionEarned,
          totalArtisanPayouts,
          totalOrders,
          approvedSellersCount,
          pendingSellersCount,
          approvedProductsCount,
          pendingProductsCount,
        },
        recentActivity: recentAuditLogs,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Get paginated immutable system audit log records
 */
export async function getAuditLogs(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 25));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actorId', 'name email role'),
      AuditLog.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        logs,
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
 * Admin: Get platform settings
 */
export async function getSettings(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        platformCommissionRate: 10,
        financialYear: '2026-27',
      });
    }

    res.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Update platform settings
 */
export async function updateSettings(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { platformCommissionRate, financialYear, defaultHsnCode, defaultGstRate } = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    if (platformCommissionRate !== undefined) {
      settings.platformCommissionRate = Number(platformCommissionRate);
    }
    if (financialYear !== undefined) {
      settings.financialYear = financialYear;
    }
    if (defaultHsnCode !== undefined) {
      (settings as any).defaultHsnCode = defaultHsnCode;
    }
    if (defaultGstRate !== undefined) {
      (settings as any).defaultGstRate = Number(defaultGstRate);
    }

    await settings.save();

    await AuditLog.create({
      actorId: req.user!._id,
      actorRole: 'admin',
      action: 'UPDATE_SETTINGS',
      targetModel: 'Settings',
      targetId: settings._id,
      metadata: {
        platformCommissionRate: settings.platformCommissionRate,
        financialYear: settings.financialYear,
      },
    });

    res.json({
      success: true,
      data: {
        settings,
      },
      message: 'Platform settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
}
