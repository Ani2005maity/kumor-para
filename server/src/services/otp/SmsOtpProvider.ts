import { ISmsOtpProvider, SendSmsOtpParams, OtpSendResult } from './OtpProvider.js';
import { AppError } from '../../middleware/errorHandler.js';

export class SmsOtpProvider implements ISmsOtpProvider {
  private providerName: string;

  constructor() {
    this.providerName = process.env.SMS_PROVIDER || '';
  }

  /**
   * Normalizes Indian phone numbers into clean E.164 format (+91XXXXXXXXXX)
   */
  static normalizeIndianPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    if (phone.startsWith('+')) {
      return phone.replace(/\s+/g, '');
    }
    return `+91${digits.slice(-10)}`;
  }

  /**
   * Extracts clean 10-digit mobile number for Indian SMS gateways (Fast2SMS, MSG91)
   */
  static get10DigitPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-10);
  }

  async sendSmsOtp(params: SendSmsOtpParams): Promise<OtpSendResult> {
    const normalizedPhone = SmsOtpProvider.normalizeIndianPhone(params.phone);
    const tenDigit = SmsOtpProvider.get10DigitPhone(params.phone);
    const textMessage = `<#> ${params.otp} is your Kumor Para verification code for ${params.purpose}. Valid for 5 minutes. Do not share this OTP with anyone.`;
    const provider = (process.env.SMS_PROVIDER || '').toLowerCase().trim();

    // 1. Twilio SMS Gateway Dispatch
    if (provider === 'twilio') {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioSid || !twilioToken || !twilioFrom) {
        const missing: string[] = [];
        if (!twilioSid) missing.push('TWILIO_ACCOUNT_SID');
        if (!twilioToken) missing.push('TWILIO_AUTH_TOKEN');
        if (!twilioFrom) missing.push('TWILIO_PHONE_NUMBER');

        throw new AppError(
          `Real SMS OTP provider (Twilio) is selected, but required credentials (${missing.join(', ')}) are missing in server .env. Please configure Twilio or set OTP_PROVIDER=mock for local development.`,
          500
        );
      }

      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const body = new URLSearchParams({
          To: normalizedPhone,
          From: twilioFrom,
          Body: textMessage,
        });

        const authHeader = `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        const resData: any = await response.json();

        if (!response.ok) {
          throw new Error(resData?.message || `Twilio HTTP status ${response.status}`);
        }

        console.log(`[SmsOtpProvider] Real Twilio SMS dispatched to ${normalizedPhone} (SID: ${resData.sid})`);
        return {
          success: true,
          messageId: resData.sid,
          provider: 'twilio',
        };
      } catch (twilioErr: any) {
        console.error(`[SmsOtpProvider] Twilio SMS dispatch failed for ${normalizedPhone}:`, twilioErr.message);
        throw new AppError(
          `Failed to deliver SMS verification code via Twilio: ${twilioErr.message}. Please check your Twilio configuration in server .env.`,
          502
        );
      }
    }

    // 2. Fast2SMS Indian SMS Gateway Dispatch
    if (provider === 'fast2sms') {
      const fast2smsKey = process.env.FAST2SMS_API_KEY;

      if (!fast2smsKey) {
        throw new AppError(
          `Real SMS OTP provider (Fast2SMS) is selected, but FAST2SMS_API_KEY is missing in server .env. Please configure Fast2SMS or set OTP_PROVIDER=mock for local development.`,
          500
        );
      }

      if (tenDigit.length !== 10) {
        throw new AppError(
          `Invalid Indian mobile number (${params.phone}). Fast2SMS requires a valid 10-digit mobile number.`,
          400
        );
      }

      try {
        const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
          method: 'POST',
          headers: {
            authorization: fast2smsKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            route: 'otp',
            variables_values: params.otp,
            numbers: tenDigit,
          }),
        });

        const fastRes: any = await response.json();
        if (fastRes.return !== true) {
          throw new Error(fastRes.message || 'Fast2SMS dispatch rejected');
        }

        console.log(`[SmsOtpProvider] Real Fast2SMS dispatched to +91${tenDigit} (ReqID: ${fastRes.request_id})`);
        return {
          success: true,
          messageId: fastRes.request_id,
          provider: 'fast2sms',
        };
      } catch (fastErr: any) {
        console.error(`[SmsOtpProvider] Fast2SMS dispatch failed for ${tenDigit}:`, fastErr.message);
        throw new AppError(
          `Failed to deliver SMS verification code via Fast2SMS: ${fastErr.message}. Please check your Fast2SMS API key.`,
          502
        );
      }
    }

    // 3. If real SMS provider was expected but SMS_PROVIDER is not set or unsupported
    throw new AppError(
      `Real SMS OTP provider is active, but SMS_PROVIDER is not configured (current: "${provider || 'empty'}"). Please set SMS_PROVIDER=twilio or SMS_PROVIDER=fast2sms with valid credentials in server .env, or set OTP_PROVIDER=mock for development testing.`,
      500
    );
  }
}
