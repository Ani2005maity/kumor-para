process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed.js';
import { AuditLog } from '../models/AuditLog.js';

async function runAuthTests() {
  console.log('🧪 Starting Milestone 2 Auth & Middleware Test Suite...\n');

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
    // 1. Customer Signup & Email OTP Verification
    console.log('--- Test 1: Customer Signup & Email OTP Verification ---');
    const newCustomerRes = await request(app)
      .post('/api/auth/customer/signup')
      .send({
        name: 'Sourav Ganguly',
        email: 'sourav@example.com',
        password: 'Password@123',
        phone: '+919830099887',
        address: {
          name: 'Sourav Ganguly',
          phone: '+919830099887',
          street: '2/1 Biren Roy Road West, Behala',
          city: 'Kolkata',
          state: 'West Bengal',
          stateCode: '19',
          pincode: '700034',
        },
      });

    assert(newCustomerRes.status === 201, 'Customer signup returns 201 Created');
    assert(newCustomerRes.body?.success === true, 'Response envelope has success: true');
    assert(newCustomerRes.body?.data?.verificationRequired === true, 'Signals verificationRequired: true');
    assert(newCustomerRes.body?.data?.user?.email === 'sourav@example.com', 'Created user has correct email');
    assert(newCustomerRes.body?.data?.user?.role === 'customer', 'Created user has role customer');
    assert(!newCustomerRes.body?.data?.user?.passwordHash, 'Password hash is NOT leaked in response');

    const customerUserId = newCustomerRes.body?.data?.userId;
    const emailOtp = (await import('../services/otp/MockOtpProvider.js')).MockOtpProvider.getLastOtpFor('sourav@example.com');

    assert(Boolean(emailOtp && emailOtp.length === 6), 'Dispatches Mock Email OTP');

    // Verify Email OTP (activates account and sets auth session cookies)
    const verifyEmailRes = await request(app)
      .post('/api/auth/verify-registration-otp')
      .send({ userId: customerUserId, channel: 'email', otp: emailOtp });
    assert(verifyEmailRes.status === 200, 'Verify email OTP returns 200');
    assert(verifyEmailRes.body?.data?.emailVerified === true, 'emailVerified is true');
    assert(verifyEmailRes.body?.data?.isFullyVerified === true, 'Account is fully verified');

    const cookies = verifyEmailRes.headers['set-cookie'];
    assert(
      Array.isArray(cookies) &&
        cookies.some((c: string) => c.includes('accessToken=') && c.includes('HttpOnly')),
      'Sets httpOnly accessToken cookie upon email verification'
    );
    assert(
      Array.isArray(cookies) &&
        cookies.some((c: string) => c.includes('refreshToken=') && c.includes('HttpOnly')),
      'Sets httpOnly refreshToken cookie upon email verification'
    );

    // 2. Duplicate Customer Signup Rejection
    console.log('\n--- Test 2: Duplicate Email Rejection ---');
    const duplicateRes = await request(app)
      .post('/api/auth/customer/signup')
      .send({
        name: 'Duplicate User',
        email: 'sourav@example.com',
        password: 'Password@123',
        phone: '+919830099887',
      });
    assert(duplicateRes.status === 409, 'Duplicate signup rejected with 409 Conflict');
    assert(duplicateRes.body?.success === false, 'Duplicate response envelope has success: false');

    // 3. Customer Login (Valid 2-Step & Invalid Password)
    console.log('\n--- Test 3: Customer Login (2-Step Authentication) ---');
    const validLoginStep1Res = await request(app)
      .post('/api/auth/customer/login')
      .send({
        email: 'sourav@example.com',
        password: 'Password@123',
      });
    assert(validLoginStep1Res.status === 200, 'Customer login step 1 returns 200');
    assert(validLoginStep1Res.body?.data?.mfaRequired === true, 'Signals mfaRequired: true');
    assert(Boolean(validLoginStep1Res.body?.data?.tempToken), 'Issues temporary 2FA token');

    const loginOtp = (await import('../services/otp/MockOtpProvider.js')).MockOtpProvider.getLastOtpFor('sourav@example.com');
    const validLoginStep2Res = await request(app)
      .post('/api/auth/login/verify-otp')
      .send({
        tempToken: validLoginStep1Res.body?.data?.tempToken,
        channel: 'email',
        otp: loginOtp,
      });
    assert(validLoginStep2Res.status === 200, 'Customer login step 2 OTP verification returns 200');
    assert(validLoginStep2Res.body?.success === true, 'Login 2FA response has success: true');

    const invalidLoginRes = await request(app)
      .post('/api/auth/customer/login')
      .send({
        email: 'sourav@example.com',
        password: 'WrongPassword!',
      });
    assert(invalidLoginRes.status === 401, 'Invalid password rejected with 401 Unauthorized');

    // 4. Seller Signup (Creates User with role 'seller' + Seller with status 'pending')
    console.log('\n--- Test 4: Seller Signup ---');
    const sellerSignupRes = await request(app)
      .post('/api/auth/seller/signup')
      .send({
        name: 'Rupali Roy',
        email: 'rupali@clayheritage.com',
        password: 'Password@123',
        phone: '+919830112233',
        shopName: 'Clay Heritage Crafts',
        legalName: 'Clay Heritage Studio LLP',
        bio: 'Artisanal handmade earthenware from rural Bengal.',
        location: 'Krishnanagar, Nadia, West Bengal',
        pickupAddress: {
          name: 'Rupali Roy Workshop',
          phone: '+919830112233',
          street: 'Palpara Main Road',
          city: 'Krishnanagar',
          state: 'West Bengal',
          stateCode: '19',
          pincode: '741101',
        },
        gstin: null,
        panLast4: '9988',
      });

    assert(sellerSignupRes.status === 201, 'Seller signup returns 201 Created');
    assert(sellerSignupRes.body?.data?.user?.role === 'seller', 'User role is seller');
    assert(sellerSignupRes.body?.data?.seller?.status === 'pending', 'Seller status is pending admin review');
    assert(sellerSignupRes.body?.data?.seller?.slug === 'clay-heritage-crafts', 'Generates unique shop slug');

    // Check AuditLog was recorded
    const auditRecord = await AuditLog.findOne({
      action: 'seller_registered',
      entityId: sellerSignupRes.body?.data?.seller?._id,
    });
    assert(!!auditRecord, 'Records audit log for seller registration');

    // 5. Seeded Admin Login
    console.log('\n--- Test 5: Admin Login ---');
    const adminLoginRes = await request(app)
      .post('/api/auth/admin/login')
      .send({
        email: 'admin@kumorpara.com',
        password: 'Password@123',
      });
    assert(adminLoginRes.status === 200, 'Seeded admin login returns 200');
    assert(adminLoginRes.body?.data?.user?.role === 'admin', 'Admin user has role admin');

    const adminCookies = adminLoginRes.headers['set-cookie'];

    // 5.1 Seeded Demo Customer Direct Login (No OTP Prompt)
    console.log('\n--- Test 5.1: Demo Customer Direct Login ---');
    const demoCustomerLoginRes = await request(app)
      .post('/api/auth/customer/login')
      .send({
        email: 'ananya@example.com',
        password: 'Password@123',
      });
    assert(demoCustomerLoginRes.status === 200, 'Demo customer login returns 200 OK');
    assert(demoCustomerLoginRes.body?.success === true, 'Demo customer login success: true');
    assert(demoCustomerLoginRes.body?.data?.user?.email === 'ananya@example.com', 'Returns demo customer user');
    assert(!demoCustomerLoginRes.body?.data?.mfaRequired, 'Demo customer does not require MFA OTP');
    const demoCustCookies = demoCustomerLoginRes.headers['set-cookie'];
    assert(
      Array.isArray(demoCustCookies) && demoCustCookies.some((c: string) => c.includes('accessToken=')),
      'Demo customer receives direct session cookie'
    );

    // 5.2 Seeded Demo Seller Direct Login (No OTP Prompt)
    console.log('\n--- Test 5.2: Demo Seller Direct Login ---');
    const demoSellerLoginRes = await request(app)
      .post('/api/auth/seller/login')
      .send({
        email: 'debjani@mrittika.com',
        password: 'Password@123',
      });
    assert(demoSellerLoginRes.status === 200, 'Demo seller login returns 200 OK');
    assert(demoSellerLoginRes.body?.success === true, 'Demo seller login success: true');
    assert(demoSellerLoginRes.body?.data?.user?.email === 'debjani@mrittika.com', 'Returns demo seller user');
    assert(demoSellerLoginRes.body?.data?.seller?.slug === 'mrittika-studio', 'Returns associated seller profile');
    assert(!demoSellerLoginRes.body?.data?.mfaRequired, 'Demo seller does not require MFA OTP');
    const demoSellerCookies = demoSellerLoginRes.headers['set-cookie'];
    assert(
      Array.isArray(demoSellerCookies) && demoSellerCookies.some((c: string) => c.includes('accessToken=')),
      'Demo seller receives direct session cookie'
    );

    // 6. Token Refresh & Rotation
    console.log('\n--- Test 6: Refresh Token Rotation ---');
    const refreshCookie = Array.isArray(adminCookies)
      ? adminCookies.find((c: string) => c.startsWith('refreshToken='))
      : undefined;

    const refreshRes = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', refreshCookie || '');

    assert(refreshRes.status === 200, 'Token refresh returns 200 OK');
    assert(refreshRes.body?.success === true, 'Token refresh has success: true');

    const newCookies = refreshRes.headers['set-cookie'];
    assert(
      Array.isArray(newCookies) &&
        newCookies.some((c: string) => c.includes('accessToken=')),
      'Issues rotated accessToken'
    );
    assert(
      Array.isArray(newCookies) &&
        newCookies.some((c: string) => c.includes('refreshToken=')),
      'Issues rotated refreshToken'
    );

    // 7. Protected Route (GET /api/auth/me)
    console.log('\n--- Test 7: Protected Route Authentication ---');
    const unauthMeRes = await request(app).get('/api/auth/me');
    assert(unauthMeRes.status === 401, 'Unauthenticated request to /api/auth/me returns 401');

    const authMeRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', adminCookies);
    assert(authMeRes.status === 200, 'Authenticated request to /api/auth/me returns 200');
    assert(authMeRes.body?.data?.user?.email === 'admin@kumorpara.com', 'Returns logged in user data');

    // 8. Logout (Clears Cookies)
    console.log('\n--- Test 8: Logout ---');
    const logoutRes = await request(app).post('/api/auth/logout');
    assert(logoutRes.status === 200, 'Logout returns 200 OK');
    const logoutCookies = logoutRes.headers['set-cookie'];
    assert(
      Array.isArray(logoutCookies) &&
        logoutCookies.some((c: string) => c.includes('accessToken=;') || c.includes('Max-Age=0')),
      'Clears accessToken cookie'
    );

    // 9. Zod Validation Error Response Envelope
    console.log('\n--- Test 9: Zod Request Validation ---');
    const invalidBodyRes = await request(app)
      .post('/api/auth/customer/signup')
      .send({
        name: 'A', // Too short (min 2)
        email: 'not-an-email',
        password: 'short', // Too short (min 8)
      });
    assert(invalidBodyRes.status === 400, 'Invalid request fails with 400 Bad Request');
    assert(invalidBodyRes.body?.success === false, 'Envelope has success: false');
    assert(Array.isArray(invalidBodyRes.body?.details), 'Envelope contains structured validation details');

  } catch (err: any) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    console.log('\n======================================================');
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');
    await disconnectDB();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

if (process.argv[1]?.includes('auth.test.ts') || process.argv[1]?.includes('auth.test.js')) {
  runAuthTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
