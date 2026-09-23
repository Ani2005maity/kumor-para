process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { Seller } from '../models/Seller.js';
import { AuditLog } from '../models/AuditLog.js';

async function runCatalogTests() {
  console.log('🧪 Starting Milestone 3 Catalog, Seller & Admin Test Suite...\n');

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
    // Helper: Obtain authentication cookies for all 3 actors
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

    const adminCookies = await loginActor('admin@kumorpara.com', 'Password@123', 'admin');
    const seller1Cookies = await loginActor('debjani@mrittika.com', 'Password@123', 'seller');
    const seller2Cookies = await loginActor('biren@shantiniketanleather.com', 'Password@123', 'seller');
    const customerCookies = await loginActor('ananya@example.com', 'Password@123', 'customer');

    // =============================================================
    // 1. Category APIs
    // =============================================================
    console.log('--- Test 1: Category Endpoints ---');
    const categoriesRes = await request(app).get('/api/categories');
    assert(categoriesRes.status === 200, 'Public GET /api/categories returns 200');
    assert(categoriesRes.body.data.categories.length === 5, 'Returns all 5 seeded categories');

    const catSlugRes = await request(app).get('/api/categories/home-decor');
    assert(catSlugRes.status === 200, 'Public GET /api/categories/:slug returns 200');
    assert(catSlugRes.body.data.category.name === 'Home Décor', 'Returns correct category by slug');

    // Admin Category Management
    const nonAdminCreateCat = await request(app)
      .post('/api/categories')
      .set('Cookie', customerCookies)
      .send({ name: 'Festive Crafts', defaultCommissionRate: 10 });
    assert(nonAdminCreateCat.status === 403, 'Non-admin category creation rejected with 403');

    const adminCreateCat = await request(app)
      .post('/api/categories')
      .set('Cookie', adminCookies)
      .send({
        name: 'Festive & Occasion',
        iconKey: 'sparkles',
        defaultCommissionRate: 15,
        hsnCode: '9505',
        gstRate: 12,
      });
    assert(adminCreateCat.status === 201, 'Admin creates category with 201 Created');
    assert(adminCreateCat.body.data.category.slug === 'festive-occasion', 'Generates correct category slug');

    const catAudit = await AuditLog.findOne({
      action: 'category_created',
      entityId: adminCreateCat.body.data.category._id,
    });
    assert(!!catAudit, 'AuditLog created for admin category creation');

    // =============================================================
    // 2. Public Product Catalog & Filtering
    // =============================================================
    console.log('\n--- Test 2: Public Product Catalog & Filters ---');
    const allProductsRes = await request(app).get('/api/products');
    assert(allProductsRes.status === 200, 'Public GET /api/products returns 200');
    assert(allProductsRes.body.data.products.length === 12, 'Returns all 12 approved products');
    assert(allProductsRes.body.data.pagination.total === 12, 'Pagination metadata is accurate');

    // Filter by Category
    const categoryFilterRes = await request(app).get('/api/products?category=home-decor');
    assert(
      categoryFilterRes.body.data.products.every(
        (p: any) => p.categoryId.slug === 'home-decor'
      ),
      'Filters products correctly by category slug'
    );

    // Filter by Price Range in paise
    const priceFilterRes = await request(app).get('/api/products?minPrice=50000&maxPrice=100000');
    assert(
      priceFilterRes.body.data.products.every(
        (p: any) => p.price >= 50000 && p.price <= 100000
      ),
      'Filters products correctly by paise price range'
    );

    // Keyword Search
    const searchRes = await request(app).get('/api/products?search=leather');
    assert(
      searchRes.body.data.products.length > 0 &&
        searchRes.body.data.products.some((p: any) => p.title.toLowerCase().includes('leather')),
      'Search query successfully matches keyword in title or description'
    );

    // Sort by price ascending
    const sortAscRes = await request(app).get('/api/products?sortBy=price_asc');
    const prices = sortAscRes.body.data.products.map((p: any) => p.price);
    const isSorted = prices.every((val: number, i: number, arr: number[]) => !i || arr[i - 1] <= val);
    assert(isSorted, 'Sorts products by price ascending');

    // Get Single Product by slug
    const singleProductRes = await request(app).get(
      '/api/products/terracotta-matte-chai-kulhar-set-6'
    );
    assert(singleProductRes.status === 200, 'GET /api/products/:slug returns 200');
    assert(
      singleProductRes.body.data.product.sellerId.shopName === 'Mrittika Studio',
      'Populates seller shop information on single product'
    );

    // =============================================================
    // 3. Seller Product Operations & Security Invariant 1 (Data Isolation)
    // =============================================================
    console.log('\n--- Test 3: Seller Product Management & Isolation Invariant ---');
    const homeDecorCat = await Category.findOne({ slug: 'home-decor' });

    // Seller 1 creates a new product in draft
    const createDraftRes = await request(app)
      .post('/api/products/seller')
      .set('Cookie', seller1Cookies)
      .send({
        title: 'Terracotta Aromatherapy Oil Diffuser',
        categoryId: homeDecorCat!._id.toString(),
        description: 'Handmade porous clay essential oil burner with carved lattice vents.',
        price: 99000, // ₹990.00 in paise
        stock: 15,
        fulfilmentType: 'ready_stock',
        materials: ['Red Clay', 'Natural Glaze'],
        dimensions: { l: 10, w: 10, h: 14, unit: 'cm' },
        colors: ['Terracotta Red', 'Dark Umber'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=800&q=80',
            publicId: 'kp_test/diffuser_1',
            alt: 'Clay Diffuser',
          },
        ],
        hsnCode: '6912',
        gstRate: 12,
        status: 'draft',
      });

    assert(createDraftRes.status === 201, 'Seller 1 creates product with status draft');
    const newProductId = createDraftRes.body.data.product._id;
    assert(createDraftRes.body.data.product.status === 'draft', 'Created product has draft status');

    // Public catalog must NOT show draft product
    const publicAfterDraft = await request(app).get('/api/products');
    assert(
      !publicAfterDraft.body.data.products.some((p: any) => p._id === newProductId),
      'Public catalog does NOT expose draft products'
    );

    // Seller 1 queries own products
    const seller1ProductsRes = await request(app)
      .get('/api/products/seller/list')
      .set('Cookie', seller1Cookies);
    assert(
      seller1ProductsRes.body.data.products.some((p: any) => p._id === newProductId),
      'Seller 1 can see their newly created product in seller list'
    );

    // SECURITY INVARIANT 1: Seller 2 cannot access Seller 1's product
    const seller2AccessRes = await request(app)
      .get(`/api/products/seller/item/${newProductId}`)
      .set('Cookie', seller2Cookies);
    assert(
      seller2AccessRes.status === 404,
      'Seller 2 cannot read Seller 1 product (DB-level filter returns 404)'
    );

    // SECURITY INVARIANT 1: Seller 2 cannot mutate Seller 1's product
    const seller2MutateRes = await request(app)
      .patch(`/api/products/seller/${newProductId}/stock`)
      .set('Cookie', seller2Cookies)
      .send({ stock: 50 });
    assert(
      seller2MutateRes.status === 404,
      'Seller 2 cannot mutate Seller 1 product stock (DB-level filter returns 404)'
    );

    // Seller 1 updates stock & price
    const updateStockRes = await request(app)
      .patch(`/api/products/seller/${newProductId}/stock`)
      .set('Cookie', seller1Cookies)
      .send({ stock: 20, price: 95000 });
    assert(updateStockRes.status === 200, 'Seller 1 successfully updates product stock & price');
    assert(updateStockRes.body.data.product.stock === 20, 'Updated stock reflects 20');
    assert(updateStockRes.body.data.product.price === 95000, 'Updated price reflects 95000 paise');

    // Seller 1 submits draft for admin review
    const submitForReviewRes = await request(app)
      .patch(`/api/products/seller/${newProductId}/submit`)
      .set('Cookie', seller1Cookies);
    assert(submitForReviewRes.status === 200, 'Seller 1 submits product for approval');
    assert(submitForReviewRes.body.data.product.status === 'pending', 'Product status is now pending');

    // =============================================================
    // 4. Admin Product Moderation & Audit Logging
    // =============================================================
    console.log('\n--- Test 4: Admin Product Moderation & Audit Logs ---');
    const adminPendingProducts = await request(app)
      .get('/api/products/admin/list?status=pending')
      .set('Cookie', adminCookies);
    assert(
      adminPendingProducts.body.data.products.some((p: any) => p._id === newProductId),
      'Admin sees newly submitted product in pending moderation queue'
    );

    // Admin approves product
    const adminApproveRes = await request(app)
      .patch(`/api/products/admin/${newProductId}/status`)
      .set('Cookie', adminCookies)
      .send({ status: 'approved' });
    assert(adminApproveRes.status === 200, 'Admin approves product successfully');
    assert(adminApproveRes.body.data.product.status === 'approved', 'Product status transitions to approved');

    const approveAudit = await AuditLog.findOne({
      action: 'product_approved',
      entityId: newProductId,
    });
    assert(!!approveAudit, 'AuditLog recorded for product approval');

    // Product is now visible in public catalog
    const publicAfterApproval = await request(app).get('/api/products');
    assert(
      publicAfterApproval.body.data.products.some((p: any) => p._id === newProductId),
      'Approved product is now live in public catalog'
    );

    // =============================================================
    // 5. Seller Public Directory, Storefront & Admin Seller Moderation
    // =============================================================
    console.log('\n--- Test 5: Seller Directory, Storefront & Admin Controls ---');
    const publicSellersRes = await request(app).get('/api/sellers');
    assert(publicSellersRes.status === 200, 'Public GET /api/sellers returns 200');
    assert(publicSellersRes.body.data.sellers.length === 2, 'Returns both approved sellers');

    const storefrontRes = await request(app).get('/api/sellers/mrittika-studio');
    assert(storefrontRes.status === 200, 'Public GET /api/sellers/:slug returns storefront');
    assert(storefrontRes.body.data.seller.shopName === 'Mrittika Studio', 'Returns shop details');
    assert(Array.isArray(storefrontRes.body.data.products), 'Returns seller products collection');

    // Admin updates seller commission override
    const seller1Doc = await Seller.findOne({ slug: 'mrittika-studio' });
    const commissionRes = await request(app)
      .patch(`/api/sellers/admin/${seller1Doc!._id}/commission`)
      .set('Cookie', adminCookies)
      .send({ commissionRate: 12 });
    assert(commissionRes.status === 200, 'Admin sets seller commission rate override to 12%');
    assert(commissionRes.body.data.seller.commissionRate === 12, 'Commission rate updated on record');

    const commissionAudit = await AuditLog.findOne({
      action: 'seller_commission_updated',
      entityId: seller1Doc!._id.toString(),
    });
    assert(!!commissionAudit, 'AuditLog recorded for seller commission rate update');

    // Cloudinary upload signature test
    const uploadSignRes = await request(app)
      .get('/api/upload/signature?folder=kumorpara/products')
      .set('Cookie', seller1Cookies);
    assert(uploadSignRes.status === 200, 'GET /api/upload/signature returns 200');
    assert(typeof uploadSignRes.body.data.signature === 'string', 'Returns secure upload signature');

  } catch (err: any) {
    console.error('Unexpected catalog test error:', err);
    failed++;
  } finally {
    console.log('\n======================================================');
    console.log(`📊 Catalog Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');
    await disconnectDB();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

if (process.argv[1]?.includes('catalog.test.ts') || process.argv[1]?.includes('catalog.test.js')) {
  runCatalogTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
