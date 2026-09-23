import { Request, Response, NextFunction } from 'express';
import { Category } from '../models/Category.js';
import { AuditLog } from '../models/AuditLog.js';
import { AppError } from '../middleware/errorHandler.js';
import { ApiResponse } from '@kumorpara/shared';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Public: Get all active categories
 */
export async function getCategories(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: Get single category by slug
 */
export async function getCategoryBySlug(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug, isActive: true });
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    res.json({
      success: true,
      data: {
        category,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Get all categories including inactive ones
 */
export async function getAllCategoriesAdmin(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: {
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Create a new category
 */
export async function createCategory(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { name, slug, parentId, iconKey, defaultCommissionRate, hsnCode, gstRate, isActive } =
      req.body;

    let finalSlug = slug || generateSlug(name);
    const existing = await Category.findOne({ slug: finalSlug });
    if (existing) {
      throw new AppError(`A category with slug '${finalSlug}' already exists`, 409);
    }

    const category = await Category.create({
      name,
      slug: finalSlug,
      parentId: parentId || null,
      iconKey: iconKey || 'sparkles',
      defaultCommissionRate: defaultCommissionRate ?? 10,
      hsnCode: hsnCode || null,
      gstRate: gstRate ?? null,
      isActive: isActive ?? true,
    });

    // Record AuditLog
    await AuditLog.create({
      actorId: req.user!._id,
      actorRole: req.user!.role,
      action: 'category_created',
      entityType: 'Category',
      entityId: category._id.toString(),
      metadata: { name: category.name, slug: category.slug },
      timestamp: new Date(),
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      data: {
        category,
      },
      message: 'Category created successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Update an existing category
 */
export async function updateCategory(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const previousData = category.toObject();
    Object.assign(category, req.body);
    await category.save();

    // Record AuditLog
    await AuditLog.create({
      actorId: req.user!._id,
      actorRole: req.user!.role,
      action: 'category_updated',
      entityType: 'Category',
      entityId: category._id.toString(),
      metadata: {
        before: { name: previousData.name, commissionRate: previousData.defaultCommissionRate },
        after: { name: category.name, commissionRate: category.defaultCommissionRate },
      },
      timestamp: new Date(),
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        category,
      },
      message: 'Category updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Delete / Deactivate category
 */
export async function deleteCategory(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const category = await Category.findById(id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    category.isActive = false;
    await category.save();

    await AuditLog.create({
      actorId: req.user!._id,
      actorRole: req.user!.role,
      action: 'category_deactivated',
      entityType: 'Category',
      entityId: category._id.toString(),
      timestamp: new Date(),
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Category deactivated successfully',
    });
  } catch (error) {
    next(error);
  }
}
