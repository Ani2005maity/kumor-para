import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { OtpVerification, IOtpVerification, OtpPurpose, OtpTargetType } from '../../models/OtpVerification.js';
import { User, IUser } from '../../models/User.js';
import { Seller } from '../../models/Seller.js';
import { IEmailOtpProvider, ISmsOtpProvider } from './OtpProvider.js';
import { EmailOtpProvider } from './EmailOtpProvider.js';
import { SmsOtpProvider } from './SmsOtpProvider.js';
import { MockOtpProvider } from './MockOtpProvider.js';
import { AppError } from '../../middleware/errorHandler.js';

function getPepper(): string {
  return process.env.OTP_PEPPER || 'kumor_para_otp_secret_pepper_2026_production_grade';
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'kumor_para_jwt_super_secret_key_2026_dev';
}

export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds
export const OTP_MAX_ATTEMPTS = 5;

export interface TempLoginPayload {
  userId: string;
  role: string;
  purpose: '2fa_login';
  createdAt: number;
}

export class OtpService {
  private emailProvider: IEmailOtpProvider | null = null;
  private smsProvider: ISmsOtpProvider | null = null;

  static isMockEnabled(): boolean {
    if (process.env.NODE_ENV === 'test') return true;
    if (process.env.OTP_PROVIDER === 'mock' || process.env.USE_MOCK_OTP === 'true') return true;
    return false;
  }

  private getEmailProvider(): IEmailOtpProvider {
    if (this.emailProvider) return this.emailProvider;
    if (OtpService.isMockEnabled()) {
      return new MockOtpProvider();
    }
    return new EmailOtpProvider();
  }

  private getSmsProvider(): ISmsOtpProvider {
    if (this.smsProvider) return this.smsProvider;
    if (OtpService.isMockEnabled()) {
      return new MockOtpProvider();
    }
    return new SmsOtpProvider();
  }

  /**
   * For testing or swapping providers at runtime
   */
  setProviders(emailProvider: IEmailOtpProvider, smsProvider: ISmsOtpProvider): void {
    this.emailProvider = emailProvider;
    this.smsProvider = smsProvider;
  }

  /**
   * Generates a cryptographically strong 6-digit numeric OTP
   */
  static generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Hashes the OTP with HMAC-SHA256 and target-specific pepper
   */
  static hashOtp(target: string, otp: string): string {
    const cleanTarget = target.toLowerCase().trim();
    const cleanOtp = otp.toString().trim().replace(/\s+/g, '');
    return crypto
      .createHmac('sha256', `${getPepper()}:${cleanTarget}`)
      .update(cleanOtp)
      .digest('hex');
  }

  /**
   * Validates OTP hash in constant time to prevent timing side-channel attacks
   */
  static verifyOtpHash(target: string, plainOtp: string, storedHash: string): boolean {
    if (!target || !plainOtp || !storedHash) return false;
    const calculatedHash = this.hashOtp(target, plainOtp);
    const calculatedBuffer = Buffer.from(calculatedHash, 'utf8');
    const storedBuffer = Buffer.from(storedHash, 'utf8');

    if (calculatedBuffer.length !== storedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(calculatedBuffer, storedBuffer);
  }

  /**
   * Masks email address (e.g. ananya@example.com -> a***a@example.com)
   */
  static maskEmail(email: string): string {
    if (!email) return '***@***.com';
    const [name, domain] = email.split('@');
    if (!domain) return '***@***.com';
    if (name.length <= 2) {
      return `${name[0]}***@${domain}`;
    }
    const first = name[0];
    const last = name[name.length - 1];
    return `${first}***${last}@${domain}`;
  }

  /**
   * Masks Indian phone number (e.g. +919876543210 -> +91 98****210)
   */
  static maskPhone(phone: string): string {
    if (!phone) return '+91 *******000';
    const digits = phone.replace(/\D/g, '');
    const prefix = phone.startsWith('+91') ? '+91 ' : '';
    const last3 = digits.slice(-3);
    const first2 = digits.slice(-10, -8) || digits.slice(0, 2);
    return `${prefix}${first2}****${last3}`;
  }

  /**
   * Generate short-lived JWT for Step 2 of 2-Step Login
   */
  static generateTempLoginToken(userId: string, role: string): string {
    return jwt.sign(
      {
        userId,
        role,
        purpose: '2fa_login',
        createdAt: Date.now(),
      },
      getJwtSecret(),
      { expiresIn: '5m' }
    );
  }

  /**
   * Verify Step 2 temporary login token
   */
  static verifyTempLoginToken(token: string): TempLoginPayload {
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as TempLoginPayload;
      if (decoded.purpose !== '2fa_login') {
        throw new AppError('Invalid authentication step token.', 401);
      }
      return decoded;
    } catch (err: any) {
      throw new AppError('Login session expired or invalid. Please sign in again.', 401);
    }
  }

  /**
   * Dispatches Email OTP for a newly registered account
   */
  async sendRegistrationOtps(user: IUser): Promise<{
    emailMasked: string;
    phoneMasked?: string;
    resendCooldownSeconds: number;
    expiresInSeconds: number;
    devEmailOtp?: string;
  }> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
    const cooldownUntil = new Date(now.getTime() + OTP_COOLDOWN_MS);
    const cleanEmail = user.email.toLowerCase().trim();

    // Generate and store Email OTP
    const emailOtp = OtpService.generateOtp();
    const emailHash = OtpService.hashOtp(cleanEmail, emailOtp);

    await OtpVerification.create({
      target: cleanEmail,
      targetType: 'email',
      purpose: 'registration',
      userId: user._id,
      otpHash: emailHash,
      expiresAt,
      cooldownUntil,
      status: 'pending',
      maxAttempts: OTP_MAX_ATTEMPTS,
    });

    // Record to mock provider only if mock is active
    if (OtpService.isMockEnabled()) {
      MockOtpProvider.record(cleanEmail, 'email', emailOtp, 'registration');
    }

    // Dispatch via email provider
    await this.getEmailProvider().sendEmailOtp({
      email: cleanEmail,
      otp: emailOtp,
      purpose: 'registration',
      userName: user.name,
    });

    const allowDevCode = OtpService.isMockEnabled() && process.env.NODE_ENV !== 'production';

    return {
      emailMasked: OtpService.maskEmail(cleanEmail),
      ...(user.phone ? { phoneMasked: OtpService.maskPhone(user.phone) } : {}),
      resendCooldownSeconds: 60,
      expiresInSeconds: 300,
      ...(allowDevCode ? { devEmailOtp: emailOtp } : {}),
    };
  }

  /**
   * Verifies an OTP for registration (Email OTP activates account)
   * Checks against all active unexpired pending registration OTPs for the user to prevent stale-code race conditions.
   */
  async verifyRegistrationOtp(params: {
    userId: string;
    channel?: 'email' | 'phone';
    otp: string;
  }): Promise<{
    success: boolean;
    channelVerified: 'email' | 'phone';
    emailVerified: boolean;
    phoneVerified?: boolean;
    isFullyVerified: boolean;
    user: IUser;
  }> {
    const { userId, channel = 'email', otp } = params;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User account not found', 404);
    }

    const cleanEmail = user.email.toLowerCase().trim();
    const cleanOtp = (otp || '').toString().trim().replace(/\s+/g, '');

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new AppError('Please enter a valid 6-digit verification code.', 400);
    }

    const pendingRecords = await OtpVerification.find({
      userId: user._id,
      targetType: 'email',
      purpose: 'registration',
      status: 'pending',
    }).sort({ createdAt: -1 });

    if (!pendingRecords || pendingRecords.length === 0) {
      throw new AppError('No pending verification code found or code already used. Please request a new code.', 400);
    }

    const now = new Date();
    let matchedRecord: IOtpVerification | null = null;

    // Search for a matching code among all unexpired pending records
    for (const record of pendingRecords) {
      if (now <= record.expiresAt && record.attempts < record.maxAttempts) {
        const isMatch = OtpService.verifyOtpHash(cleanEmail, cleanOtp, record.otpHash);
        if (isMatch) {
          matchedRecord = record;
          break;
        }
      }
    }

    if (!matchedRecord) {
      const latestRecord = pendingRecords[0];

      // Check if latest code expired
      if (now > latestRecord.expiresAt) {
        latestRecord.status = 'expired';
        await latestRecord.save();
        throw new AppError('Verification code has expired. Please request a new one.', 400);
      }

      // Check if latest code exhausted
      if (latestRecord.attempts >= latestRecord.maxAttempts) {
        latestRecord.status = 'exhausted';
        await latestRecord.save();
        throw new AppError('Maximum verification attempts exceeded. Please request a new code.', 400);
      }

      // Increment failed attempt on the latest record
      latestRecord.attempts += 1;
      if (latestRecord.attempts >= latestRecord.maxAttempts) {
        latestRecord.status = 'exhausted';
      }
      await latestRecord.save();

      const remainingAttempts = Math.max(0, latestRecord.maxAttempts - latestRecord.attempts);
      throw new AppError(
        `Invalid verification code. ${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining.`,
        400
      );
    }

    // Mark matched OTP as verified
    matchedRecord.status = 'verified';
    await matchedRecord.save();

    // Expire any other pending registration OTPs for this user (single-use / cleanup)
    await OtpVerification.updateMany(
      {
        userId: user._id,
        targetType: 'email',
        purpose: 'registration',
        status: 'pending',
        _id: { $ne: matchedRecord._id },
      },
      { status: 'expired' }
    );

    // Update User verification status: Email verification activates account
    user.emailVerified = true;
    user.isAccountActive = true;
    await user.save();

    return {
      success: true,
      channelVerified: 'email',
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      isFullyVerified: true,
      user,
    };
  }

  /**
   * Resends OTP for registration
   */
  async resendRegistrationOtp(params: {
    userId: string;
    channel?: 'email' | 'phone';
  }): Promise<{
    success: boolean;
    channel: 'email' | 'phone';
    maskedTarget: string;
    resendCooldownSeconds: number;
    expiresInSeconds: number;
    devOtp?: string;
  }> {
    const { userId, channel = 'email' } = params;
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.emailVerified && user.isAccountActive) {
      throw new AppError('Account email is already verified.', 400);
    }

    const cleanEmail = user.email.toLowerCase().trim();

    // Check cooldown on latest record
    const latestRecord = await OtpVerification.findOne({
      userId: user._id,
      targetType: 'email',
      purpose: 'registration',
    }).sort({ createdAt: -1 });

    const now = new Date();
    if (latestRecord && now < latestRecord.cooldownUntil) {
      const remainingSeconds = Math.ceil((latestRecord.cooldownUntil.getTime() - now.getTime()) / 1000);
      throw new AppError(`Please wait ${remainingSeconds}s before requesting another code.`, 429);
    }

    // Create fresh OTP
    const otp = OtpService.generateOtp();
    const otpHash = OtpService.hashOtp(cleanEmail, otp);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
    const cooldownUntil = new Date(now.getTime() + OTP_COOLDOWN_MS);

    await OtpVerification.create({
      target: cleanEmail,
      targetType: 'email',
      purpose: 'registration',
      userId: user._id,
      otpHash,
      expiresAt,
      cooldownUntil,
      status: 'pending',
      maxAttempts: OTP_MAX_ATTEMPTS,
    });

    if (OtpService.isMockEnabled()) {
      MockOtpProvider.record(cleanEmail, 'email', otp, 'registration');
    }

    await this.getEmailProvider().sendEmailOtp({
      email: cleanEmail,
      otp,
      purpose: 'registration',
      userName: user.name,
    });

    const allowDevCode = OtpService.isMockEnabled() && process.env.NODE_ENV !== 'production';

    return {
      success: true,
      channel: 'email',
      maskedTarget: OtpService.maskEmail(cleanEmail),
      resendCooldownSeconds: 60,
      expiresInSeconds: 300,
      ...(allowDevCode ? { devOtp: otp } : {}),
    };
  }

  /**
   * Initiate 2-Step Login OTP for verified user (sent to Email)
   */
  async sendLoginOtp(user: IUser, _preferredChannel: 'email' | 'phone' = 'email'): Promise<{
    tempToken: string;
    channel: 'email' | 'phone';
    maskedTarget: string;
    resendCooldownSeconds: number;
    expiresInSeconds: number;
    devOtp?: string;
  }> {
    const channel = 'email';
    const cleanEmail = user.email.toLowerCase().trim();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS);
    const cooldownUntil = new Date(now.getTime() + OTP_COOLDOWN_MS);

    const otp = OtpService.generateOtp();
    const otpHash = OtpService.hashOtp(cleanEmail, otp);

    await OtpVerification.create({
      target: cleanEmail,
      targetType: channel,
      purpose: 'login',
      userId: user._id,
      otpHash,
      expiresAt,
      cooldownUntil,
      status: 'pending',
      maxAttempts: OTP_MAX_ATTEMPTS,
    });

    if (OtpService.isMockEnabled()) {
      MockOtpProvider.record(cleanEmail, channel, otp, 'login');
    }

    await this.getEmailProvider().sendEmailOtp({
      email: cleanEmail,
      otp,
      purpose: 'login',
      userName: user.name,
    });

    const tempToken = OtpService.generateTempLoginToken(user._id.toString(), user.role);
    const allowDevCode = OtpService.isMockEnabled() && process.env.NODE_ENV !== 'production';

    return {
      tempToken,
      channel,
      maskedTarget: OtpService.maskEmail(cleanEmail),
      resendCooldownSeconds: 60,
      expiresInSeconds: 300,
      ...(allowDevCode ? { devOtp: otp } : {}),
    };
  }

  /**
   * Verifies Step 2 Login OTP
   * Checks against all active unexpired pending login OTPs for the user to prevent stale-code race conditions.
   */
  async verifyLoginOtp(tempToken: string, otp: string): Promise<{
    user: IUser;
    seller?: any;
  }> {
    const payload = OtpService.verifyTempLoginToken(tempToken);
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const cleanEmail = user.email.toLowerCase().trim();
    const cleanOtp = (otp || '').toString().trim().replace(/\s+/g, '');

    if (!cleanOtp || cleanOtp.length !== 6) {
      throw new AppError('Please enter a valid 6-digit verification code.', 400);
    }

    const pendingRecords = await OtpVerification.find({
      userId: user._id,
      purpose: 'login',
      status: 'pending',
    }).sort({ createdAt: -1 });

    if (!pendingRecords || pendingRecords.length === 0) {
      throw new AppError('No active login verification code found. Please request a new one.', 400);
    }

    const now = new Date();
    let matchedRecord: IOtpVerification | null = null;

    for (const record of pendingRecords) {
      if (now <= record.expiresAt && record.attempts < record.maxAttempts) {
        const isMatch = OtpService.verifyOtpHash(cleanEmail, cleanOtp, record.otpHash);
        if (isMatch) {
          matchedRecord = record;
          break;
        }
      }
    }

    if (!matchedRecord) {
      const latestRecord = pendingRecords[0];

      if (now > latestRecord.expiresAt) {
        latestRecord.status = 'expired';
        await latestRecord.save();
        throw new AppError('Verification code has expired. Please sign in again.', 400);
      }

      if (latestRecord.attempts >= latestRecord.maxAttempts) {
        latestRecord.status = 'exhausted';
        await latestRecord.save();
        throw new AppError('Maximum verification attempts exceeded. Please sign in again.', 400);
      }

      latestRecord.attempts += 1;
      if (latestRecord.attempts >= latestRecord.maxAttempts) {
        latestRecord.status = 'exhausted';
      }
      await latestRecord.save();

      const remaining = Math.max(0, latestRecord.maxAttempts - latestRecord.attempts);
      throw new AppError(
        `Invalid verification code. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
        400
      );
    }

    // Mark matched OTP as verified
    matchedRecord.status = 'verified';
    await matchedRecord.save();

    // Expire any other pending login OTPs for this user
    await OtpVerification.updateMany(
      {
        userId: user._id,
        purpose: 'login',
        status: 'pending',
        _id: { $ne: matchedRecord._id },
      },
      { status: 'expired' }
    );

    let seller = null;
    if (user.role === 'seller') {
      seller = await Seller.findOne({ userId: user._id });
    }

    return { user, seller };
  }

  /**
   * Resends login OTP
   */
  async resendLoginOtp(tempToken: string, preferredChannel?: 'email' | 'phone'): Promise<{
    success: boolean;
    channel: 'email' | 'phone';
    maskedTarget: string;
    resendCooldownSeconds: number;
    expiresInSeconds: number;
  }> {
    const payload = OtpService.verifyTempLoginToken(tempToken);
    const user = await User.findById(payload.userId);
    if (!user) {
      throw new AppError('User not found.', 404);
    }

    const channel = preferredChannel || 'email';

    const latestRecord = await OtpVerification.findOne({
      userId: user._id,
      purpose: 'login',
    }).sort({ createdAt: -1 });

    const now = new Date();
    if (latestRecord && now < latestRecord.cooldownUntil) {
      const remainingSeconds = Math.ceil((latestRecord.cooldownUntil.getTime() - now.getTime()) / 1000);
      throw new AppError(`Please wait ${remainingSeconds}s before requesting another code.`, 429);
    }

    const otpData = await this.sendLoginOtp(user, channel);
    return {
      success: true,
      channel: otpData.channel,
      maskedTarget: otpData.maskedTarget,
      resendCooldownSeconds: otpData.resendCooldownSeconds,
      expiresInSeconds: otpData.expiresInSeconds,
    };
  }
}

export const otpService = new OtpService();
