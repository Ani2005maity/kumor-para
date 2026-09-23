process.env.NODE_ENV = 'test';

import request from 'supertest';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { seedDatabase } from '../seed.js';
import { MockOtpProvider } from '../services/otp/MockOtpProvider.js';
import { OtpVerification } from '../models/OtpVerification.js';
import { User } from '../models/User.js';
import { Seller } from '../models/Seller.js';

async function runOtpTests() {
  console.log('🧪 Starting Email OTP & 2FA Test Suite...\n');

  await connectDB();
  await seedDatabase(false);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`, detail ? `- ${typeof detail === 'object' ? JSON.stringify(detail) : detail}` : '');
      failed++;
    }
  }

  try {
    MockOtpProvider.clear();

    // =========================================================================
    // Test 1: Customer Registration Email OTP Generation
    // =========================================================================
    console.log('--- Test 1: Registration Email OTP Generation ---');
    const customerEmail = 'vikram@example.com';
    const customerPhone = '+919876500112';

    const signupRes = await request(app)
      .post('/api/auth/customer/signup')
      .send({
        name: 'Vikram Seth',
        email: customerEmail,
        password: 'Password@123',
        phone: customerPhone,
        address: {
          name: 'Vikram Seth',
          phone: customerPhone,
          street: '15 Lake View Road',
          city: 'Kolkata',
          state: 'West Bengal',
          stateCode: '19',
          pincode: '700029',
        },
      });

    assert(signupRes.status === 201, 'Signup returns 201 Created');
    assert(signupRes.body?.success === true, 'Response envelope has success: true');
    assert(signupRes.body?.data?.verificationRequired === true, 'Signals verificationRequired: true');
    assert(Boolean(signupRes.body?.data?.userId), 'Returns userId for OTP verification step');
    assert(signupRes.body?.data?.emailVerified === false, 'User starts with emailVerified: false');
    assert(!signupRes.body?.data?.otp, 'Plain OTP is NEVER returned in response body');
    assert(!signupRes.body?.data?.emailOtp, 'Email OTP is NEVER returned in response body');

    const customerUserId = signupRes.body?.data?.userId;

    // Verify Email OTP in Mock Provider
    const sentEmailOtp = MockOtpProvider.getLastOtpFor(customerEmail);

    assert(Boolean(sentEmailOtp && sentEmailOtp.length === 6), 'Dispatches 6-digit numeric Email OTP');

    // Verify Database Hashing
    const emailOtpRecord = await OtpVerification.findOne({
      userId: customerUserId,
      targetType: 'email',
      purpose: 'registration',
    });
    assert(Boolean(emailOtpRecord), 'Persists Email OtpVerification record in DB');
    assert(emailOtpRecord?.status === 'pending', 'OTP record starts in pending status');
    assert(emailOtpRecord?.otpHash !== sentEmailOtp, 'OTP is cryptographically hashed in DB (never plain text)');

    // =========================================================================
    // Test 2: Unverified Account Login Rejection
    // =========================================================================
    console.log('\n--- Test 2: Unverified Account Login Rejection ---');
    const unverifiedLoginRes = await request(app)
      .post('/api/auth/customer/login')
      .send({
        email: customerEmail,
        password: 'Password@123',
      });

    assert(unverifiedLoginRes.status === 403, 'Unverified account login rejected with 403 Forbidden');
    assert(unverifiedLoginRes.body?.data?.verificationRequired === true, 'Login response signals verification required');

    // =========================================================================
    // Test 3: Wrong OTP Rejection & Max Attempts
    // =========================================================================
    console.log('\n--- Test 3: Wrong OTP & Attempt Tracking ---');
    const activeEmailRecord = await OtpVerification.findOne({
      userId: customerUserId,
      targetType: 'email',
      purpose: 'registration',
      status: 'pending',
    }).sort({ createdAt: -1 });

    const wrongOtpRes = await request(app)
      .post('/api/auth/verify-registration-otp')
      .send({
        userId: customerUserId,
        channel: 'email',
        otp: '000000',
      });

    assert(wrongOtpRes.status === 400, 'Invalid OTP rejected with 400 Bad Request');
    assert(wrongOtpRes.body?.error.includes('attempt'), 'Returns remaining attempts notice');

    // Check attempt counter in DB
    const updatedRecord = await OtpVerification.findById(activeEmailRecord?._id);
    assert(updatedRecord?.attempts === 1, 'Failed attempt incremented attempts counter to 1', { attempts: updatedRecord?.attempts });

    // Simulate exhausting max attempts
    await OtpVerification.findByIdAndUpdate(activeEmailRecord?._id, { attempts: 5 });
    const currentSentEmailOtp = MockOtpProvider.getLastOtpFor(customerEmail);
    const exhaustedRes = await request(app)
      .post('/api/auth/verify-registration-otp')
      .send({
        userId: customerUserId,
        channel: 'email',
        otp: currentSentEmailOtp,
      });

    assert(exhaustedRes.status === 400, 'Exhausted attempts code rejected', exhaustedRes.body);
    assert(Boolean(exhaustedRes.body?.error?.includes('Maximum verification attempts exceeded')), 'Clear error for exhausted code', exhaustedRes.body);

    // =========================================================================
    // Test 4: Resend Cooldown Enforcement & Fresh OTP Generation
    // =========================================================================
    console.log('\n--- Test 4: Resend Cooldown Enforcement ---');
    const latestEmailRecord = await OtpVerification.findOne({
      userId: customerUserId,
      targetType: 'email',
      purpose: 'registration',
    }).sort({ createdAt: -1 });

    // Set cooldown in future
    await OtpVerification.findByIdAndUpdate(latestEmailRecord?._id, {
      cooldownUntil: new Date(Date.now() + 45000),
    });

    const cooldownRes = await request(app)
      .post('/api/auth/resend-registration-otp')
      .send({
        userId: customerUserId,
        channel: 'email',
      });

    assert(cooldownRes.status === 429, 'Resend during cooldown rejected with 429 Too Many Requests', cooldownRes.body);

    // Clear cooldown to allow fresh resend
    await OtpVerification.findByIdAndUpdate(latestEmailRecord?._id, {
      cooldownUntil: new Date(Date.now() - 1000),
    });

    const validResendRes = await request(app)
      .post('/api/auth/resend-registration-otp')
      .send({
        userId: customerUserId,
        channel: 'email',
      });

    assert(validResendRes.status === 200, 'Valid resend returns 200 OK', validResendRes.body);
    const freshEmailOtp = MockOtpProvider.getLastOtpFor(customerEmail);
    assert(Boolean(freshEmailOtp && freshEmailOtp !== currentSentEmailOtp), 'Fresh unique OTP dispatched upon resend');

    // =========================================================================
    // Test 5: Email OTP Verification Activates Account
    // =========================================================================
    console.log('\n--- Test 5: Email OTP Verification Activates Account ---');

    // Verify Email
    const verifyEmailRes = await request(app)
      .post('/api/auth/verify-registration-otp')
      .send({
        userId: customerUserId,
        channel: 'email',
        otp: freshEmailOtp,
      });

    assert(verifyEmailRes.status === 200, 'Email OTP verification returns 200 OK', verifyEmailRes.body);
    assert(verifyEmailRes.body?.data?.emailVerified === true, 'emailVerified is now true');
    assert(verifyEmailRes.body?.data?.isFullyVerified === true, 'isFullyVerified is true upon email verification');

    const cookies = verifyEmailRes.headers['set-cookie'];
    assert(
      Array.isArray(cookies) && cookies.some((c: string) => c.includes('accessToken=')),
      'Sets httpOnly accessToken session cookie upon email verification'
    );

    // Reusing already-verified OTP should fail
    const reuseRes = await request(app)
      .post('/api/auth/verify-registration-otp')
      .send({
        userId: customerUserId,
        channel: 'email',
        otp: freshEmailOtp,
      });
    assert(reuseRes.status === 400, 'Reusing already-verified OTP rejected with 400');

    // Verify user record in DB is active
    const verifiedUser = await User.findById(customerUserId);
    assert(verifiedUser?.isAccountActive === true, 'User is marked isAccountActive: true in DB');

    // =========================================================================
    // Test 6: Expired OTP Rejection
    // =========================================================================
    console.log('\n--- Test 6: Expired OTP Rejection ---');
    const expiredTargetUser = await User.create({
      name: 'Expired Test',
      email: 'expired@example.com',
      passwordHash: 'dummy',
      phone: '+919999988888',
      role: 'customer',
      emailVerified: false,
      phoneVerified: false,
      isAccountActive: false,
    });

    await OtpVerification.create({
      target: 'expired@example.com',
      targetType: 'email',
      purpose: 'registration',
      userId: expiredTargetUser._id,
      otpHash: 'dummyhash',
      expiresAt: new Date(Date.now() - 10000), // Expired 10s ago
      cooldownUntil: new Date(),
      status: 'pending',
      maxAttempts: 5,
    });

    const expiredRes = await request(app)
      .post('/api/auth/verify-registration-otp')
      .send({
        userId: expiredTargetUser._id.toString(),
        channel: 'email',
        otp: '123456',
      });

    assert(expiredRes.status === 400, 'Expired OTP rejected with 400');
    assert(Boolean(expiredRes.body?.error?.includes('expired')), 'Error states verification code has expired', expiredRes.body);

    // =========================================================================
    // Test 7: 2-Step Login (2FA via Email) for Verified Customer & Seller
    // =========================================================================
    console.log('\n--- Test 7: 2-Step Login (2FA) Flow ---');
    // Step 7.1: Submit valid email & password
    const loginStep1Res = await request(app)
      .post('/api/auth/login')
      .send({
        email: customerEmail,
        password: 'Password@123',
      });

    assert(loginStep1Res.status === 200, 'Step 1 login returns 200 OK', loginStep1Res.body);
    assert(loginStep1Res.body?.data?.mfaRequired === true, 'Requires MFA Step 2');
    assert(Boolean(loginStep1Res.body?.data?.tempToken), 'Issues short-lived tempToken for Step 2');
    assert(!loginStep1Res.headers['set-cookie'], 'Does NOT set auth session cookies before Step 2 OTP');

    const tempLoginToken = loginStep1Res.body?.data?.tempToken;
    const loginOtp = MockOtpProvider.getLastOtpFor(customerEmail);
    assert(Boolean(loginOtp && loginOtp.length === 6), 'Dispatches 6-digit login OTP to registered email');

    // Step 7.2: Wrong Login OTP
    const wrongLoginOtpRes = await request(app)
      .post('/api/auth/login/verify-otp')
      .send({
        tempToken: tempLoginToken,
        otp: '999999',
      });
    assert(wrongLoginOtpRes.status === 400, 'Wrong Login OTP rejected with 400');

    // Step 7.3: Correct Login OTP
    const validLoginOtpRes = await request(app)
      .post('/api/auth/login/verify-otp')
      .send({
        tempToken: tempLoginToken,
        otp: loginOtp,
      });

    assert(validLoginOtpRes.status === 200, 'Step 2 login OTP verification returns 200 OK');
    assert(validLoginOtpRes.body?.data?.user?.email === customerEmail, 'Returns authenticated user data');
    const loginCookies = validLoginOtpRes.headers['set-cookie'];
    assert(
      Array.isArray(loginCookies) && loginCookies.some((c: string) => c.includes('accessToken=')),
      'Sets full authenticated session cookies after successful 2FA'
    );

    // =========================================================================
    // Test 8: Admin Direct Authentication (Bypasses Customer/Seller 2FA)
    // =========================================================================
    console.log('\n--- Test 8: Admin Authentication Independence ---');
    const adminLoginRes = await request(app)
      .post('/api/auth/admin/login')
      .send({
        email: 'admin@kumorpara.com',
        password: 'Password@123',
      });

    assert(adminLoginRes.status === 200, 'Admin login returns 200 OK directly');
    assert(adminLoginRes.body?.data?.user?.role === 'admin', 'Authenticated as admin');
    const adminCookies = adminLoginRes.headers['set-cookie'];
    assert(
      Array.isArray(adminCookies) && adminCookies.some((c: string) => c.includes('accessToken=')),
      'Admin receives direct authenticated session'
    );

    // =========================================================================
    // Test 8.1: Pre-verified Demo Account Direct Login (Customer & Seller)
    // =========================================================================
    console.log('\n--- Test 8.1: Pre-verified Demo Account Direct Login ---');
    // Demo Customer 1 (Ananya)
    const demoCustRes = await request(app)
      .post('/api/auth/customer/login')
      .send({ email: 'ananya@example.com', password: 'Password@123' });
    assert(demoCustRes.status === 200, 'Demo customer 1 logs in directly with 200 OK');
    assert(demoCustRes.body?.data?.user?.email === 'ananya@example.com', 'Returns demo customer');
    assert(!demoCustRes.body?.data?.mfaRequired, 'Demo customer has no MFA challenge');
    assert(
      Array.isArray(demoCustRes.headers['set-cookie']) &&
        demoCustRes.headers['set-cookie'].some((c: string) => c.includes('accessToken=')),
      'Demo customer receives auth cookie'
    );

    // Demo Customer 2 (Rahul)
    const demoCust2Res = await request(app)
      .post('/api/auth/customer/login')
      .send({ email: 'rahul@example.com', password: 'Password@123' });
    assert(demoCust2Res.status === 200, 'Demo customer 2 logs in directly with 200 OK');
    assert(!demoCust2Res.body?.data?.mfaRequired, 'Demo customer 2 has no MFA challenge');

    // Demo Seller (Debjani Mukherjee)
    const demoSellerRes = await request(app)
      .post('/api/auth/seller/login')
      .send({ email: 'debjani@mrittika.com', password: 'Password@123' });
    assert(demoSellerRes.status === 200, 'Demo seller logs in directly with 200 OK');
    assert(demoSellerRes.body?.data?.user?.email === 'debjani@mrittika.com', 'Returns demo seller');
    assert(demoSellerRes.body?.data?.seller?.shopName === 'Mrittika Studio', 'Returns seller studio details');
    assert(!demoSellerRes.body?.data?.mfaRequired, 'Demo seller has no MFA challenge');
    assert(
      Array.isArray(demoSellerRes.headers['set-cookie']) &&
        demoSellerRes.headers['set-cookie'].some((c: string) => c.includes('accessToken=')),
      'Demo seller receives auth cookie'
    );

    // =========================================================================
    // Test 9: Seller Registration Email OTP Flow
    // =========================================================================
    console.log('\n--- Test 9: Seller Registration Email OTP Flow ---');
    const sellerEmail = 'tanmoy@claycrafts.com';
    const sellerPhone = '+919830554433';

    const sellerSignupRes = await request(app)
      .post('/api/auth/seller/signup')
      .send({
        name: 'Tanmoy Pal',
        email: sellerEmail,
        password: 'Password@123',
        phone: sellerPhone,
        shopName: 'Tanmoy Clay Arts',
        legalName: 'Tanmoy Pal Pottery Studio',
        pickupAddress: {
          name: 'Tanmoy Pal',
          phone: sellerPhone,
          street: '5 Pottery Lane, Kumartuli',
          city: 'Kolkata',
          state: 'West Bengal',
          stateCode: '19',
          pincode: '700005',
        },
      });

    assert(sellerSignupRes.status === 201, 'Seller signup returns 201 Created');
    assert(sellerSignupRes.body?.data?.verificationRequired === true, 'Signals seller verification required');

    const sellerUserId = sellerSignupRes.body?.data?.userId;
    const sellerEmailOtp = MockOtpProvider.getLastOtpFor(sellerEmail);

    // Verify seller email
    const finalSellerVerifyRes = await request(app)
      .post('/api/auth/verify-registration-otp')
      .send({
        userId: sellerUserId,
        channel: 'email',
        otp: sellerEmailOtp,
      });

    assert(finalSellerVerifyRes.status === 200, 'Seller email OTP verification succeeds');
    assert(finalSellerVerifyRes.body?.data?.isFullyVerified === true, 'Seller email is verified and active');

    const sellerRecord = await Seller.findOne({ userId: sellerUserId });
    assert(sellerRecord?.status === 'pending', 'Verified seller remains in pending status for admin moderation');

    // =========================================================================
    // Test 10: Regression Test - Exact Generated Code Verification & Whitespace Tolerance
    // =========================================================================
    console.log('\n--- Test 10: Regression Test - Exact Code Verification & Normalization ---');
    const regressionEmail = 'exactmatch@example.com';
    const regRes = await request(app)
      .post('/api/auth/customer/signup')
      .send({
        name: 'Exact Match User',
        email: regressionEmail,
        password: 'Password@123',
        phone: '+919876599999',
      });

    assert(regRes.status === 201, 'Registration returns 201');
    const regUserId = regRes.body?.data?.userId;
    const generatedOtp = MockOtpProvider.getLastOtpFor(regressionEmail);
    assert(Boolean(generatedOtp && generatedOtp.length === 6), 'Generated 6-digit OTP');

    // Verify with whitespace
    const verifyWhitespaceRes = await request(app)
      .post('/api/auth/verify-registration-otp')
      .send({
        userId: regUserId,
        channel: 'email',
        otp: `  ${generatedOtp}  `,
      });

    assert(verifyWhitespaceRes.status === 200, 'Exact generated code with whitespace successfully verifies');
    assert(verifyWhitespaceRes.body?.data?.isFullyVerified === true, 'Account activated');

    // =========================================================================
    // Test 11: Regression Test - Resend Multi-Code Immunity (No Stale Race)
    // =========================================================================
    console.log('\n--- Test 11: Resend Multi-Code Immunity (No Stale Race) ---');
    const raceEmail = 'raceimmune@example.com';
    const raceSignupRes = await request(app)
      .post('/api/auth/customer/signup')
      .send({
        name: 'Race Immune User',
        email: raceEmail,
        password: 'Password@123',
        phone: '+919876588888',
      });

    const raceUserId = raceSignupRes.body?.data?.userId;
    const otp1 = MockOtpProvider.getLastOtpFor(raceEmail);

    // Bypass cooldown for testing multiple concurrent valid codes
    await OtpVerification.updateMany(
      { userId: raceUserId },
      { cooldownUntil: new Date(Date.now() - 5000) }
    );

    // Request resend -> generates OTP 2
    const resendRes = await request(app)
      .post('/api/auth/resend-registration-otp')
      .send({
        userId: raceUserId,
        channel: 'email',
      });
    assert(resendRes.status === 200, 'Resend succeeds');
    const otp2 = MockOtpProvider.getLastOtpFor(raceEmail);
    assert(Boolean(otp2 && otp2 !== otp1), 'OTP 2 is fresh and distinct from OTP 1');

    // Verifying with OTP 1 (from first email) should still succeed without race condition
    const verifyOtp1Res = await request(app)
      .post('/api/auth/verify-registration-otp')
      .send({
        userId: raceUserId,
        channel: 'email',
        otp: otp1,
      });

    assert(verifyOtp1Res.status === 200, 'First unexpired OTP code still accepted without stale-code race');
    assert(verifyOtp1Res.body?.data?.isFullyVerified === true, 'User fully verified');

    // After verification, single-use rule prevents reusing OTP 2
    const reuseOtp2Res = await request(app)
      .post('/api/auth/verify-registration-otp')
      .send({
        userId: raceUserId,
        channel: 'email',
        otp: otp2,
      });
    assert(reuseOtp2Res.status === 400, 'Single-use: Remaining OTPs invalidated upon first successful verification');

  } catch (err: any) {
    console.error('Unexpected OTP test error:', err);
    failed++;
  } finally {
    console.log('\n======================================================');
    console.log(`📊 OTP & 2FA Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('======================================================\n');
    await disconnectDB();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

if (process.argv[1]?.includes('otp.test.ts') || process.argv[1]?.includes('otp.test.js')) {
  runOtpTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
