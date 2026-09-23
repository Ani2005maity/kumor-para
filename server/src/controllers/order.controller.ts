import { Request, Response, NextFunction } from 'express';
import { Order } from '../models/Order.js';
import { SellerOrder } from '../models/SellerOrder.js';
import { Product } from '../models/Product.js';
import { Seller } from '../models/Seller.js';
import { Category } from '../models/Category.js';
import { Payment } from '../models/Payment.js';
import { Settings } from '../models/Settings.js';
import { resolveCommissionRate, calculateCommission } from '../services/commission.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { ApiResponse, IOrderItemSnapshot } from '@kumorpara/shared';

// Helper to generate a unique master order number e.g. KP000123
function generateOrderNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  return `KP${timestamp}${randomSuffix}`;
}

/**
 * Valid SellerOrder Status Transitions
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  new: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/**
 * Customer: Checkout (Multi-vendor Cart, Atomic Stock Decrement & Order Splitting)
 */
export async function checkout(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  const decrementedItems: { productId: string; qty: number }[] = [];

  try {
    const customerId = req.user!._id;
    const { shippingAddress, billingAddress, items } = req.body;

    const finalBillingAddress = billingAddress || shippingAddress;

    // 1. Fetch platform settings
    const settings = await Settings.findOne();

    // 2. Atomic Stock Decrement with Safe Rollback
    const productMap = new Map<string, any>();

    for (const item of items) {
      // Find and decrement stock atomically in DB (ensures stock never goes negative)
      const product = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          stock: { $gte: item.qty },
          isActive: true,
          status: 'approved',
        },
        { $inc: { stock: -item.qty } },
        { new: true }
      );

      if (!product) {
        // Rollback all previously decremented items
        for (const dec of decrementedItems) {
          await Product.findByIdAndUpdate(dec.productId, { $inc: { stock: dec.qty } });
        }

        // Fetch product info to provide a clear error message
        const targetProd = await Product.findById(item.productId);
        const name = targetProd ? targetProd.title : 'Selected item';
        throw new AppError(
          `"${name}" is out of stock or does not have the requested quantity available.`,
          400,
          { productId: item.productId }
        );
      }

      decrementedItems.push({ productId: item.productId, qty: item.qty });
      productMap.set(item.productId, product);
    }

    // 3. Group Cart Items by Seller ID
    const itemsBySeller = new Map<string, { product: any; itemInput: any }[]>();

    for (const item of items) {
      const product = productMap.get(item.productId);
      const sellerIdStr = product.sellerId.toString();

      if (!itemsBySeller.has(sellerIdStr)) {
        itemsBySeller.set(sellerIdStr, []);
      }
      itemsBySeller.get(sellerIdStr)!.push({ product, itemInput: item });
    }

    // 4. Create Master Order Record First
    const masterOrderNumber = generateOrderNumber();
    let masterItemsSubtotal = 0;
    let masterDeliveryFee = 0;

    // Preliminary calculate master totals
    for (const [_, sellerItems] of itemsBySeller) {
      for (const { product, itemInput } of sellerItems) {
        const effectiveUnitPrice = product.discountPrice ?? product.price;
        masterItemsSubtotal += effectiveUnitPrice * itemInput.qty;
      }
    }

    const masterGrandTotal = masterItemsSubtotal + masterDeliveryFee;

    const masterOrder = await Order.create({
      orderNumber: masterOrderNumber,
      customerId,
      shippingAddress,
      billingAddress: finalBillingAddress,
      itemsSubtotal: masterItemsSubtotal,
      deliveryFee: masterDeliveryFee,
      grandTotal: masterGrandTotal,
      paymentStatus: 'pending',
      placedAt: new Date(),
    });

    // 5. Create N SellerOrders (One per distinct seller)
    const createdSellerOrders = [];

    for (const [sellerIdStr, sellerItems] of itemsBySeller) {
      const seller = await Seller.findById(sellerIdStr);
      if (!seller) {
        throw new AppError(`Seller account not found for ID: ${sellerIdStr}`, 500);
      }

      let sellerSubtotal = 0;
      const sellerDeliveryFee = 0;
      const itemSnapshots: IOrderItemSnapshot[] = [];

      let primaryCategory = null;

      for (const { product, itemInput } of sellerItems) {
        const effectiveUnitPrice = product.discountPrice ?? product.price;
        const lineTotal = effectiveUnitPrice * itemInput.qty;
        sellerSubtotal += lineTotal;

        if (!primaryCategory && product.categoryId) {
          primaryCategory = await Category.findById(product.categoryId);
        }

        const primaryImage =
          product.images && product.images.length > 0
            ? product.images[0].url
            : '';

        itemSnapshots.push({
          productId: product._id.toString(),
          title: product.title,
          image: primaryImage,
          unitPrice: effectiveUnitPrice,
          qty: itemInput.qty,
          customisationNote: itemInput.customisationNote || '',
          hsnCode: product.hsnCode || '',
          gstRate: product.gstRate || 0,
          lineTotal,
        });
      }

      // Resolve Commission
      const resolvedRate = await resolveCommissionRate(seller, primaryCategory, settings);
      const { commissionRate, commissionAmount, sellerPayout } = calculateCommission(
        sellerSubtotal,
        resolvedRate
      );

      const sellerOrder = await SellerOrder.create({
        orderId: masterOrder._id,
        sellerId: seller._id,
        items: itemSnapshots,
        subtotal: sellerSubtotal,
        deliveryFee: sellerDeliveryFee,
        commissionRate,
        commissionAmount,
        sellerPayout,
        status: 'new',
        statusHistory: [
          {
            status: 'new',
            at: new Date(),
            byUserId: customerId,
          },
        ],
        settlementStatus: 'pending',
      });

      createdSellerOrders.push(sellerOrder);
    }

    // 6. Create Payment Record (Mock / Razorpay ready)
    const payment = await Payment.create({
      orderId: masterOrder._id,
      provider: 'mock',
      amount: masterGrandTotal,
      status: 'pending',
      rawPayloadHash: '',
    });

    res.status(201).json({
      success: true,
      data: {
        order: masterOrder,
        sellerOrders: createdSellerOrders,
        payment: {
          id: payment._id,
          provider: payment.provider,
          amount: payment.amount,
          status: payment.status,
        },
      },
      message: 'Order placed successfully. N SellerOrders generated.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Customer: Get list of own orders (with embedded SellerOrder summaries)
 */
export async function getMyOrders(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const customerId = req.user!._id;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ customerId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ customerId }),
    ]);

    // Attach seller order statuses to each master order
    const populatedOrders = await Promise.all(
      orders.map(async (order) => {
        const sellerOrders = await SellerOrder.find({ orderId: order._id })
          .populate('sellerId', 'shopName slug location logoUrl')
          .select('sellerId status subtotal items courierName trackingRef createdAt');

        const orderObj = order.toObject();
        return {
          ...orderObj,
          totalAmount: order.grandTotal,
          sellerOrders,
        };
      })
    );

    res.json({
      success: true,
      data: {
        orders: populatedOrders,
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
 * Customer: Get single order details with full seller orders
 */
export async function getMyOrderById(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const customerId = req.user!._id;
    const order = await Order.findOne({ _id: req.params.id, customerId });

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const sellerOrders = await SellerOrder.find({ orderId: order._id }).populate(
      'sellerId',
      'shopName slug location pickupAddress logoUrl'
    );

    const orderObj = order.toObject();

    res.json({
      success: true,
      data: {
        order: {
          ...orderObj,
          totalAmount: order.grandTotal,
        },
        sellerOrders,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Get own SellerOrders list (Enforces Security Invariant 1: DB-level filter)
 */
export async function getSellerOrders(
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
    if (req.query.settlementStatus) {
      filter.settlementStatus = req.query.settlementStatus;
    }

    const [sellerOrders, total] = await Promise.all([
      SellerOrder.find(filter)
        .populate('orderId', 'orderNumber paymentStatus placedAt shippingAddress customerId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      SellerOrder.countDocuments(filter),
    ]);

    // Normalize each sellerOrder for frontend dashboard & pipeline components
    const normalizedOrders = sellerOrders.map((so) => {
      const obj = so.toObject();
      const orderDoc: any = obj.orderId;
      return {
        ...obj,
        sellerOrderNumber: orderDoc?.orderNumber || obj._id.toString().slice(-8).toUpperCase(),
        shippingAddressSnapshot: (obj as any).shippingAddressSnapshot || orderDoc?.shippingAddress || null,
        courierInfo: {
          courier: obj.courierName || '',
          trackingNumber: obj.trackingRef || '',
        },
      };
    });

    res.json({
      success: true,
      data: {
        orders: normalizedOrders,
        sellerOrders: normalizedOrders,
        total,
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
 * Seller: Get single SellerOrder details
 */
export async function getSellerOrderById(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const sellerId = req.seller!._id;
    const sellerOrder = await SellerOrder.findOne({
      _id: req.params.id,
      sellerId, // Enforces seller isolation
    }).populate('orderId', 'orderNumber customerId paymentStatus placedAt shippingAddress');

    if (!sellerOrder) {
      throw new AppError('Seller order not found in your orders', 404);
    }

    const obj = sellerOrder.toObject();
    const orderDoc: any = obj.orderId;
    const normalized = {
      ...obj,
      sellerOrderNumber: orderDoc?.orderNumber || obj._id.toString().slice(-8).toUpperCase(),
      shippingAddressSnapshot: (obj as any).shippingAddressSnapshot || orderDoc?.shippingAddress || null,
      courierInfo: {
        courier: obj.courierName || '',
        trackingNumber: obj.trackingRef || '',
      },
    };

    res.json({
      success: true,
      data: {
        order: normalized,
        sellerOrder: normalized,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Seller: Transition SellerOrder status
 */
export async function updateSellerOrderStatus(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const sellerId = req.seller!._id;
    const { id } = req.params;
    const { status: targetStatus, courierName, trackingRef, courierInfo } = req.body;

    const sellerOrder = await SellerOrder.findOne({
      _id: id,
      sellerId, // Enforces seller isolation
    });

    if (!sellerOrder) {
      throw new AppError('Seller order not found in your orders', 404);
    }

    // Validate transition
    const currentStatus = sellerOrder.status;
    const allowedNextStatuses = VALID_TRANSITIONS[currentStatus] || [];

    if (!allowedNextStatuses.includes(targetStatus)) {
      throw new AppError(
        `Cannot transition seller order status from '${currentStatus}' to '${targetStatus}'. Allowed: ${allowedNextStatuses.join(
          ', '
        ) || 'None (terminal status)'}`,
        400
      );
    }

    // Update status
    sellerOrder.status = targetStatus;

    if (courierName !== undefined) sellerOrder.courierName = courierName;
    if (trackingRef !== undefined) sellerOrder.trackingRef = trackingRef;
    if (courierInfo?.courier) sellerOrder.courierName = courierInfo.courier;
    if (courierInfo?.trackingNumber) sellerOrder.trackingRef = courierInfo.trackingNumber;

    // Append to status history
    sellerOrder.statusHistory.push({
      status: targetStatus,
      at: new Date(),
      byUserId: req.user!._id,
    });

    await sellerOrder.save();

    const obj = sellerOrder.toObject();
    const normalized = {
      ...obj,
      shippingAddressSnapshot: (obj as any).shippingAddressSnapshot || null,
      courierInfo: {
        courier: obj.courierName || '',
        trackingNumber: obj.trackingRef || '',
      },
    };

    res.json({
      success: true,
      data: {
        order: normalized,
        sellerOrder: normalized,
      },
      message: `Order status updated to '${targetStatus}'.`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin: Get all orders across the entire platform
 */
export async function getAdminOrders(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }
    if (req.query.search) {
      filter.orderNumber = new RegExp(req.query.search as string, 'i');
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customerId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(filter),
    ]);

    const populatedOrders = await Promise.all(
      orders.map(async (order) => {
        const sellerOrders = await SellerOrder.find({ orderId: order._id }).populate(
          'sellerId',
          'shopName slug'
        );
        return {
          ...order.toObject(),
          sellerOrders,
        };
      })
    );

    res.json({
      success: true,
      data: {
        orders: populatedOrders,
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
 * Admin: Get single order with all related seller orders
 */
export async function getAdminOrderById(
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction
): Promise<void> {
  try {
    const order = await Order.findById(req.params.id).populate(
      'customerId',
      'name email phone'
    );

    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const [sellerOrders, payment] = await Promise.all([
      SellerOrder.find({ orderId: order._id }).populate(
        'sellerId',
        'shopName slug legalName location gstin'
      ),
      Payment.findOne({ orderId: order._id }),
    ]);

    res.json({
      success: true,
      data: {
        order,
        sellerOrders,
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
}
