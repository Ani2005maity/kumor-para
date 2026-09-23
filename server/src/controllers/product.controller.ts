import { Request, Response, NextFunction } from 'express';
import { Product } from '../models/Product.js';
import { Category } from '../models/Category.js';
import { Seller } from '../models/Seller.js';
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
 * Public: Get products catalog with rich filters & pagination
 */
export async function getProducts(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {
      status: 'approved',
      isActive: true,
    };

    // Category filter (slug or ID)
    if (req.query.category) {
      const catParam = req.query.category as string;
      const cat = await Category.findOne({
        $or: [{ slug: catParam }, { _id: catParam.match(/^[0-9a-fA-F]{24}$/) ? catParam : null }],
      });
      if (cat) {
        filter.categoryId = cat._id;
      }
    }

    // Seller filter (slug or ID)
    if (req.query.seller) {
      const sellerParam = req.query.seller as string;
      const seller = await Seller.findOne({
        $or: [{ slug: sellerParam }, { _id: sellerParam.match(/^[0-9a-fA-F]{24}$/) ? sellerParam : null }],
      });
      if (seller) {
        filter.sellerId = seller._id;
      }
    }

    // Price filter (in paise)
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseInt(req.query.minPrice as string);
      if (req.query.maxPrice) filter.price.$lte = parseInt(req.query.maxPrice as string);
    }

    // Material filter
    if (req.query.material) {
      filter.materials = { $regex: new RegExp(req.query.material as string, 'i') };
    }

    // Rating filter
    if (req.query.rating) {
      filter.rating = { $gte: parseFloat(req.query.rating as string) };
    }

    // Fulfilment type filter
    if (req.query.fulfilmentType) {
      filter.fulfilmentType = req.query.fulfilmentType;
    }

    // In Stock filter
    if (req.query.inStock === 'true') {
      filter.stock = { $gt: 0 };
    }

    // Full-text / Search query filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search as string, 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { materials: searchRegex },
        { colors: searchRegex },
      ];
    }

    // Sort order
    let sort: any = { createdAt: -1 };
    switch (req.query.sortBy) {
      case 'price_asc':
        sort = { price: 1 };
        break;
      case 'price_desc':
        sort = { price: -1 };
        break;
      case 'rating':
        sort = { rating: -1, reviewCount: -1 };
        break;
      case 'popular':
        sort = { reviewCount: -1, rating: -1 };
        break;
      case 'newest':
      default:
        sort = { createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug iconKey')
        .populate('sellerId', 'shopName slug location logoUrl rating')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        products,
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
 * Public: Get featured / curated products
 */
export async function getFeaturedProducts(
  _req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const products = await Product.find({ status: 'approved', isActive: true })
      .populate('categoryId', 'name slug')
      .populate('sellerId', 'shopName slug location logoUrl rating')
      .sort({ rating: -1, reviewCount: -1 })
      .limit(8);

    res.json({
      success: true,
      data: {
        products,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Public: Get single product by slug
 */
export async function getProductBySlug(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug, isActive: true })
      .populate('categoryId', 'name slug iconKey defaultCommissionRate hsnCode gstRate')
      .populate('sellerId', 'shopName slug legalName location bio logoUrl bannerUrl rating totalSales');

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    // If product is not approved, only the owner seller or admin can view it
    if (product.status !== 'approved') {
      const isOwner = req.seller && product.sellerId._id.toString() === req.seller._id.toString();
      const isAdmin = req.user && req.user.role === 'admin';
      if (!isOwner && !isAdmin) {
        throw new AppError('Product not found or pending approval', 404);
      }
    }

    res.json({
      success: true,
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Get only logged-in seller's products (Enforces Security Invariant 1)
 */
export async function getSellerProducts(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const sellerId = req.seller!._id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = { sellerId };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.search) {
      filter.title = new RegExp(req.query.search as string, 'i');
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        products,
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
 * Seller: Get own product by ID
 */
export async function getSellerProductById(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      sellerId: req.seller!._id, // Enforces seller isolation
    }).populate('categoryId', 'name slug');

    if (!product) {
      throw new AppError('Product not found in your inventory', 404);
    }

    res.json({
      success: true,
      data: {
        product,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Create a new product
 */
export async function createProduct(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const {
      title,
      categoryId,
      description,
      price,
      discountPrice,
      stock,
      fulfilmentType,
      productionDays,
      customisationAvailable,
      customisationPrompt,
      materials,
      dimensions,
      colors,
      images,
      hsnCode,
      gstRate,
      status,
    } = req.body;

    let category = null;
    if (categoryId && typeof categoryId === 'string') {
      if (categoryId.match(/^[0-9a-fA-F]{24}$/)) {
        category = await Category.findById(categoryId);
      } else {
        category = await Category.findOne({ slug: categoryId, isActive: true });
      }
    }
    if (!category) {
      category = await Category.findOne({ isActive: true });
    }
    if (!category) {
      throw new AppError('No active category found. Please create a category first.', 400);
    }

    let baseSlug = generateSlug(title);
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (await Product.findOne({ slug: uniqueSlug })) {
      uniqueSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    const product = await Product.create({
      sellerId: req.seller!._id,
      categoryId: category._id,
      title,
      slug: uniqueSlug,
      description,
      price,
      discountPrice: discountPrice || null,
      stock: stock ?? 0,
      fulfilmentType: fulfilmentType || 'ready_stock',
      productionDays: fulfilmentType === 'made_to_order' ? productionDays : 0,
      customisationAvailable: customisationAvailable || false,
      customisationPrompt: customisationPrompt || null,
      materials: materials || [],
      dimensions: dimensions || { l: 0, w: 0, h: 0, unit: 'cm' },
      colors: colors || [],
      images: images || [],
      hsnCode: hsnCode || category.hsnCode || '6912',
      gstRate: gstRate ?? category.gstRate ?? 0,
      status: status === 'pending' ? 'pending' : 'draft',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      data: {
        product,
      },
      message:
        product.status === 'pending'
          ? 'Product submitted for admin approval.'
          : 'Product saved as draft.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Update an existing product
 */
export async function updateProduct(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const product = await Product.findOne({
      _id: id,
      sellerId: req.seller!._id, // Enforces seller isolation
    });

    if (!product) {
      throw new AppError('Product not found in your catalog', 404);
    }

    // Apply updates
    Object.assign(product, req.body);

    // If key marketing attributes were updated on an already-approved product,
    // transition back to pending for administrative re-review
    if (product.status === 'approved' && (req.body.title || req.body.images || req.body.description)) {
      product.status = 'pending';
    }

    await product.save();

    res.json({
      success: true,
      data: {
        product,
      },
      message: 'Product updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Quick update for stock & price
 */
export async function updateProductStock(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { stock, price, discountPrice } = req.body;

    const product = await Product.findOne({
      _id: id,
      sellerId: req.seller!._id,
    });

    if (!product) {
      throw new AppError('Product not found in your catalog', 404);
    }

    product.stock = stock;
    if (price !== undefined) product.price = price;
    if (discountPrice !== undefined) product.discountPrice = discountPrice;

    await product.save();

    res.json({
      success: true,
      data: {
        product,
      },
      message: 'Stock and price updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Submit draft/rejected product for admin approval
 */
export async function submitProductForApproval(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const product = await Product.findOne({
      _id: id,
      sellerId: req.seller!._id,
    });

    if (!product) {
      throw new AppError('Product not found in your catalog', 404);
    }

    product.status = 'pending';
    product.rejectionReason = null;
    await product.save();

    res.json({
      success: true,
      data: {
        product,
      },
      message: 'Product submitted for admin review.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Delete product
 */
export async function deleteProduct(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const product = await Product.findOne({
      _id: id,
      sellerId: req.seller!._id,
    });

    if (!product) {
      throw new AppError('Product not found in your catalog', 404);
    }

    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product removed from your catalog.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Get all products with full filters and status queue
 */
export async function getAdminProducts(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.sellerId) {
      filter.sellerId = req.query.sellerId;
    }
    if (req.query.categoryId) {
      filter.categoryId = req.query.categoryId;
    }
    if (req.query.search) {
      filter.title = new RegExp(req.query.search as string, 'i');
    }

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug')
        .populate('sellerId', 'shopName slug legalName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        products,
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
 * Admin: Approve or Reject a product (with Audit Log)
 */
export async function updateProductStatus(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const product = await Product.findById(id).populate('sellerId', 'shopName');
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const previousStatus = product.status;
    product.status = status;
    product.rejectionReason = status === 'rejected' ? rejectionReason : null;
    await product.save();

    // Record AuditLog
    await AuditLog.create({
      actorId: req.user!._id,
      actorRole: req.user!.role,
      action: status === 'approved' ? 'product_approved' : 'product_rejected',
      entityType: 'Product',
      entityId: product._id.toString(),
      metadata: {
        title: product.title,
        previousStatus,
        newStatus: status,
        rejectionReason: product.rejectionReason,
      },
      timestamp: new Date(),
      ip: req.ip,
    });

    res.json({
      success: true,
      data: {
        product,
      },
      message: `Product ${status === 'approved' ? 'approved' : 'rejected'} successfully.`,
    });
  } catch (error) {
    next(error);
  }
}
