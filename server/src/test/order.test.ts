process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed.js';
import { Product } from '../models/Product.js';
import { Seller } from '../models/Seller.js';
import { Category } from '../models/Category.js';
import { Order } from '../models/Order.js';
import { SellerOrder } from '../models/SellerOrder.js';
import { Settings } from '../models/Settings.js';
import {
  resolveCommissionRate,
  calculateCommission,
} from '../services/commission.service.js';

async function runOrderTests() {
  console.log('🧪 Starting Milestone 4 Order Splitting, Commission & Concurrency Test Suite...\n');

  await connectDB();
  await seedDatabase(false);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Helper: Obtain authentication cookies for all actors
    // -------------------------------------------------------------
    const { MockOtpProvider } = await import('../services/otp/MockOtpProvider.js');
    async function loginActor(email: string, password: string, role: 'customer' | 'seller' | 'admin') {
      if (role === 'admin') {
        const res = await request(app).post('/api/auth/admin/login').send({ email, password });
        return res.headers['set-cookie'];
      }
      const endpoint = role === 'seller' ? '/api/auth/seller/login' : '/api/auth/customer/login';
      const step1 = await request(app).post(endpoint).send({ email, password });
      if (step1.body?.data?.mfaRequired) {
        const otp = MockOtpProvider.getLastOtpFor(email);
        const step2 = await request(app).post('/api/auth/login/verify-otp').send({
          tempToken: step1.body.data.tempToken,
          channel: 'email',
          otp,
        });
        return step2.headers['set-cookie'];
      }
      return step1.headers['set-cookie'];
    }

    const customerCookies = await loginActor('ananya@example.com', 'Password@123', 'customer');
    const seller1Cookies = await loginActor('debjani@mrittika.com', 'Password@123', 'seller');
    const seller2Cookies = await loginActor('biren@shantiniketanleather.com', 'Password@123', 'seller');
    const adminCookies = await loginActor('admin@kumorpara.com', 'Password@123', 'admin');

    // =============================================================
    // 1. Commission Engine Math & 3-Tier Hierarchy Tests
    // =============================================================
    console.log('--- Test 1: Commission Engine Math & 3-Tier Hierarchy ---');
    const mrittikaSeller = await Seller.findOne({ slug: 'mrittika-studio' });
    const leatherSeller = await Seller.findOne({ slug: 'shantiniketan-leather-crafts' });
    const jewelleryCat = await Category.findOne({ slug: 'jewellery' });
    const settings = await Settings.findOne();

    // Tier 1: Seller with custom override (Mrittika Studio has 8%)
    const rate1 = await resolveCommissionRate(mrittikaSeller!, jewelleryCat, settings);
    assert(rate1 === 8, 'Tier 1: Resolves seller custom commission rate override (8%)');

    // Tier 2: Seller without override on category with default (Jewellery has 12%)
    const rate2 = await resolveCommissionRate(leatherSeller!, jewelleryCat, settings);
    assert(rate2 === 12, 'Tier 2: Resolves category default commission rate (12%)');

    // Tier 3: Seller without override and category without rate -> falls back to platform settings (10%)
    const rate3 = await resolveCommissionRate(leatherSeller!, null, settings);
    assert(rate3 === 10, 'Tier 3: Falls back to platform default commission rate (10%)');

    // Arithmetic check (all integers in paise)
    const calcResult = calculateCommission(100000, 8); // ₹1,000.00 @ 8%
    assert(calcResult.commissionAmount === 8000, 'Calculates 8,000 paise (₹80.00) commission');
    assert(calcResult.sellerPayout === 92000, 'Calculates 92,000 paise (₹920.00) seller payout');
    assert(
      calcResult.commissionAmount + calcResult.sellerPayout === 100000,
      'Commission + Payout exactly equals subtotal in integer paise'
    );

    // =============================================================
    // 2. Multi-Vendor Cart Checkout & Order Splitting Test
    // =============================================================
    console.log('\n--- Test 2: Multi-Vendor Checkout & Order Splitting ---');
    const kulharProduct = await Product.findOne({ slug: 'terracotta-matte-chai-kulhar-set-6' });
    const walletProduct = await Product.findOne({
      slug: 'hand-stitched-leather-bifold-wallet-floral-batik',
    });

    assert(!!kulharProduct && !!walletProduct, 'Found test products from both sellers');

    // Kulhar: discountPrice 75000 paise (₹750.00). Qty: 2 = 150000 paise
    // Wallet: discountPrice 105000 paise (₹1,050.00). Qty: 1 = 105000 paise
    // Total Expected: 255000 paise (₹2,550.00)
    const checkoutRes = await request(app)
      .post('/api/orders/checkout')
      .set('Cookie', customerCookies)
      .send({
        shippingAddress: {
          name: 'Ananya Sen',
          phone: '+919831122334',
          street: 'Flat 4B, Greenfield Heights, New Town',
          city: 'Kolkata',
          state: 'West Bengal',
          stateCode: '19',
          pincode: '700156',
        },
        items: [
          {
            productId: kulharProduct!._id.toString(),
            qty: 2,
            customisationNote: 'Handle with care',
          },
          {
            productId: walletProduct!._id.toString(),
            qty: 1,
          },
        ],
      });

    assert(checkoutRes.status === 201, 'Multi-vendor checkout returns 201 Created');
    assert(checkoutRes.body.success === true, 'Response envelope has success: true');

    const createdOrder = checkoutRes.body.data.order;
    const createdSellerOrders = checkoutRes.body.data.sellerOrders;

    assert(!!createdOrder.orderNumber, 'Master order has unique orderNumber');
    assert(createdOrder.itemsSubtotal === 255000, 'Master itemsSubtotal is 255000 paise (₹2,550.00)');
    assert(createdOrder.grandTotal === 255000, 'Master grandTotal matches subtotal + delivery');
    assert(
      Array.isArray(createdSellerOrders) && createdSellerOrders.length === 2,
      'Split cart into exactly 2 SellerOrders (one per distinct seller)'
    );

    // Verify SellerOrder 1 (Mrittika Studio)
    const so1 = createdSellerOrders.find(
      (so: any) => so.sellerId.toString() === mrittikaSeller!._id.toString()
    );
    assert(!!so1, 'Created SellerOrder for Mrittika Studio');
    assert(so1.subtotal === 150000, 'SellerOrder 1 subtotal is 150000 paise');
    assert(so1.commissionRate === 8, 'SellerOrder 1 snapshot commission rate is 8%');
    assert(so1.commissionAmount === 12000, 'SellerOrder 1 commission amount is 12000 paise (₹120.00)');
    assert(so1.sellerPayout === 138000, 'SellerOrder 1 payout is 138000 paise (₹1,380.00)');
    assert(so1.status === 'new', 'SellerOrder 1 starts in "new" status');

    // Verify SellerOrder 2 (Shantiniketan Leather)
    const so2 = createdSellerOrders.find(
      (so: any) => so.sellerId.toString() === leatherSeller!._id.toString()
    );
    assert(!!so2, 'Created SellerOrder for Shantiniketan Leather');
    assert(so2.subtotal === 105000, 'SellerOrder 2 subtotal is 105000 paise');
    assert(so2.commissionRate === 10, 'SellerOrder 2 snapshot commission rate is 10%');
    assert(so2.commissionAmount === 10500, 'SellerOrder 2 commission amount is 10500 paise');
    assert(so2.sellerPayout === 94500, 'SellerOrder 2 payout is 94500 paise');

    // Customer can view their order
    const myOrderRes = await request(app)
      .get(`/api/orders/my-orders/${createdOrder._id}`)
      .set('Cookie', customerCookies);
    assert(myOrderRes.status === 200, 'Customer can view their placed order');
    assert(myOrderRes.body.data.sellerOrders.length === 2, 'Customer sees both seller orders');

    // =============================================================
    // 3. Atomic Stock Decrement & Concurrency Test
    // =============================================================
    console.log('\n--- Test 3: Atomic Stock Concurrency Test (10 racers for 3 stock items) ---');

    // Create a product with strictly 3 items in stock
    const limitedProduct = await Product.create({
      sellerId: mrittikaSeller!._id,
      categoryId: jewelleryCat!._id,
      title: 'Limited Edition Terracotta Choker Necklace',
      slug: `limited-edition-choker-${Date.now()}`,
      description: 'Exclusive limited edition artisan choker.',
      price: 120000, // ₹1,200.00
      stock: 3, // Exactly 3 available
      fulfilmentType: 'ready_stock',
      materials: ['Clay', 'Silk Thread'],
      dimensions: { l: 25, w: 3, h: 1, unit: 'cm' },
      colors: ['Black', 'Terracotta Red'],
      images: [
        {
          url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
          publicId: 'kp_test/limited_choker',
          alt: 'Limited Choker',
        },
      ],
      hsnCode: '7117',
      gstRate: 3,
      status: 'approved',
      isActive: true,
    });

    const checkoutPayload = {
      shippingAddress: {
        name: 'Ananya Sen',
        phone: '+919831122334',
        street: 'Flat 4B, Greenfield Heights, New Town',
        city: 'Kolkata',
        state: 'West Bengal',
        stateCode: '19',
        pincode: '700156',
      },
      items: [
        {
          productId: limitedProduct._id.toString(),
          qty: 1,
        },
      ],
    };

    // Fire 10 parallel checkouts concurrently racing for the 3 stock items
    const parallelRequests = Array.from({ length: 10 }).map(() =>
      request(app)
        .post('/api/orders/checkout')
        .set('Cookie', customerCookies)
        .send(checkoutPayload)
    );

    const results = await Promise.all(parallelRequests);

    const successCount = results.filter((r) => r.status === 201).length;
    const failureCount = results.filter((r) => r.status === 400).length;

    assert(
      successCount === 3,
      `Exactly 3 concurrent checkouts succeeded (Actual: ${successCount})`
    );
    assert(
      failureCount === 7,
      `Exactly 7 concurrent checkouts failed with 400 Out of Stock (Actual: ${failureCount})`
    );

    // Verify stock at database level
    const refreshedProduct = await Product.findById(limitedProduct._id);
    assert(
      refreshedProduct!.stock === 0,
      `Product stock decremented atomically to exactly 0 (Actual: ${refreshedProduct!.stock})`
    );
    assert(
      refreshedProduct!.stock >= 0,
      'Product stock never became negative under high concurrency'
    );

    // =============================================================
    // 4. Seller Order Status Pipeline & Cross-Seller Isolation
    // =============================================================
    console.log('\n--- Test 4: Seller Order Status Pipeline & Security Isolation ---');

    // Seller 1 checks their order list
    const seller1OrdersRes = await request(app)
      .get('/api/orders/seller/list')
      .set('Cookie', seller1Cookies);
    assert(seller1OrdersRes.status === 200, 'Seller 1 fetches their SellerOrder list');
    assert(
      seller1OrdersRes.body.data.sellerOrders.some((so: any) => so._id === so1._id),
      'Seller 1 sees their own SellerOrder'
    );

    // SECURITY CHECK: Seller 2 cannot access Seller 1's SellerOrder
    const crossSellerGetRes = await request(app)
      .get(`/api/orders/seller/item/${so1._id}`)
      .set('Cookie', seller2Cookies);
    assert(
      crossSellerGetRes.status === 404,
      'Seller 2 cannot read Seller 1 SellerOrder (DB-level filter returns 404)'
    );

    const crossSellerPatchRes = await request(app)
      .patch(`/api/orders/seller/item/${so1._id}/status`)
      .set('Cookie', seller2Cookies)
      .send({ status: 'accepted' });
    assert(
      crossSellerPatchRes.status === 404,
      'Seller 2 cannot mutate Seller 1 SellerOrder status (DB-level filter returns 404)'
    );

    // Seller 1 transitions status pipeline: new -> accepted -> preparing -> ready_for_pickup -> shipped -> delivered
    const step1 = await request(app)
      .patch(`/api/orders/seller/item/${so1._id}/status`)
      .set('Cookie', seller1Cookies)
      .send({ status: 'accepted' });
    assert(step1.status === 200, 'Seller 1 transitions status from new -> accepted');

    const step2 = await request(app)
      .patch(`/api/orders/seller/item/${so1._id}/status`)
      .set('Cookie', seller1Cookies)
      .send({ status: 'preparing' });
    assert(step2.status === 200, 'Seller 1 transitions status from accepted -> preparing');

    const step3 = await request(app)
      .patch(`/api/orders/seller/item/${so1._id}/status`)
      .set('Cookie', seller1Cookies)
      .send({ status: 'ready_for_pickup' });
    assert(step3.status === 200, 'Seller 1 transitions status from preparing -> ready_for_pickup');

    const step4 = await request(app)
      .patch(`/api/orders/seller/item/${so1._id}/status`)
      .set('Cookie', seller1Cookies)
      .send({
        status: 'shipped',
        courierName: 'Blue Dart Express',
        trackingRef: 'BD987654321',
      });
    assert(step4.status === 200, 'Seller 1 transitions status from ready_for_pickup -> shipped');
    assert(step4.body.data.sellerOrder.courierName === 'Blue Dart Express', 'Records courier name');
    assert(step4.body.data.sellerOrder.trackingRef === 'BD987654321', 'Records tracking reference');

    const step5 = await request(app)
      .patch(`/api/orders/seller/item/${so1._id}/status`)
      .set('Cookie', seller1Cookies)
      .send({ status: 'delivered' });
    assert(step5.status === 200, 'Seller 1 transitions status from shipped -> delivered');

    // Invalid transition from terminal status 'delivered' -> 'accepted'
    const invalidStep = await request(app)
      .patch(`/api/orders/seller/item/${so1._id}/status`)
      .set('Cookie', seller1Cookies)
      .send({ status: 'accepted' });
    assert(invalidStep.status === 400, 'Illegal transition from terminal delivered state rejected with 400');

    // Verify statusHistory array recorded all transitions
    const finalSo = await SellerOrder.findById(so1._id);
    assert(
      finalSo!.statusHistory.length >= 6,
      'statusHistory captured full audit trail of state transitions'
    );

    // =============================================================
    // 5. Admin Order Oversight
    // =============================================================
    console.log('\n--- Test 5: Admin Order Oversight ---');
    const adminOrdersRes = await request(app)
      .get('/api/orders/admin/list')
      .set('Cookie', adminCookies);
    assert(adminOrdersRes.status === 200, 'Admin can view all platform orders');
    assert(adminOrdersRes.body.data.orders.length > 0, 'Admin orders list populated');

    const adminDetailRes = await request(app)
      .get(`/api/orders/admin/detail/${createdOrder._id}`)
      .set('Cookie', adminCookies);
    assert(adminDetailRes.status === 200, 'Admin can inspect order details');
    assert(adminDetailRes.body.data.sellerOrders.length === 2, 'Admin sees all associated seller orders');

  } catch (err: any) {
    console.error('Unexpected order test error:', err);
    failed++;
  } finally {
    console.log('\n======================================================');
    console.log(`📊 Order Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');
    await disconnectDB();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

if (process.argv[1]?.includes('order.test.ts') || process.argv[1]?.includes('order.test.js')) {
  runOrderTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
