import {
  IEmailOtpProvider,
  ISmsOtpProvider,
  SendEmailOtpParams,
  SendSmsOtpParams,
  OtpSendResult,
} from './OtpProvider.js';

interface SentRecord {
  target: string;
  type: 'email' | 'phone';
  otp: string;
  purpose: string;
  timestamp: Date;
}

export class MockOtpProvider implements IEmailOtpProvider, ISmsOtpProvider {
  private static sentRecords: SentRecord[] = [];

  static record(target: string, type: 'email' | 'phone', otp: string, purpose: string): void {
    this.sentRecords.push({
      target,
      type,
      otp,
      purpose,
      timestamp: new Date(),
    });
  }

  static getLastOtpFor(target: string): string | undefined {
    const normalized = target.toLowerCase().trim();
    const matches = this.sentRecords.filter(
      (r) => r.target.toLowerCase().trim() === normalized
    );
    return matches.length > 0 ? matches[matches.length - 1].otp : undefined;
  }

  static getAllRecords(): SentRecord[] {
    return [...this.sentRecords];
  }

  static clear(): void {
    this.sentRecords = [];
  }

  async sendEmailOtp(params: SendEmailOtpParams): Promise<OtpSendResult> {
    MockOtpProvider.record(params.email, 'email', params.otp, params.purpose);

    if (process.env.NODE_ENV === 'development' && (process.env.OTP_PROVIDER === 'mock' || process.env.USE_MOCK_OTP === 'true')) {
      console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  [MOCK EMAIL OTP]     -> ${params.email.padEnd(46)}║
║  Code: ${params.otp}  (Expires in 5 minutes)                              ║
║  Recipient: ${(params.userName || 'Customer/Artisan').padEnd(30)} Purpose: ${params.purpose.padEnd(16)}║
╚══════════════════════════════════════════════════════════════════════════╝
`);
    }

    return {
      success: true,
      messageId: `mock-email-${Date.now()}`,
      provider: 'mock-email',
    };
  }

  async sendSmsOtp(params: SendSmsOtpParams): Promise<OtpSendResult> {
    MockOtpProvider.record(params.phone, 'phone', params.otp, params.purpose);

    if (process.env.NODE_ENV === 'development' && (process.env.OTP_PROVIDER === 'mock' || process.env.USE_MOCK_OTP === 'true')) {
      console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║  [MOCK SMS OTP]       -> ${params.phone.padEnd(46)}║
║  Code: ${params.otp}  (Expires in 5 minutes)                              ║
║  Recipient: ${(params.userName || 'Customer/Artisan').padEnd(30)} Purpose: ${params.purpose.padEnd(16)}║
╚══════════════════════════════════════════════════════════════════════════╝
`);
    }

    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
      provider: 'mock-sms',
    };
  }
}
