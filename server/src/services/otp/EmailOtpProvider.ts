import { Resend } from 'resend';
import { IEmailOtpProvider, SendEmailOtpParams, OtpSendResult } from './OtpProvider.js';
import { AppError } from '../../middleware/errorHandler.js';

export class EmailOtpProvider implements IEmailOtpProvider {
  private fromEmail: string;
  private resendClient: Resend | null = null;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'Kumor Para <onboarding@resend.dev>';
  }

  private getClient(): Resend {
    if (this.resendClient) return this.resendClient;

    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
      throw new AppError(
        'Real Email OTP provider is active, but RESEND_API_KEY is missing in server environment. Please configure RESEND_API_KEY in server .env / Render or set OTP_PROVIDER=mock for local development.',
        500
      );
    }

    this.resendClient = new Resend(apiKey);
    return this.resendClient;
  }

  async sendEmailOtp(params: SendEmailOtpParams): Promise<OtpSendResult> {
    const resend = this.getClient();

    const subject =
      params.purpose === 'registration'
        ? 'Verify your Kumor Para Account'
        : params.purpose === 'login'
        ? 'Kumor Para Login Verification Code'
        : 'Kumor Para Security Code';

    const greeting = params.userName ? `Hello ${params.userName},` : 'Hello,';
    const actionText =
      params.purpose === 'registration'
        ? 'completing your registration on Kumor Para'
        : params.purpose === 'login'
        ? 'signing into your Kumor Para account'
        : 'verifying your identity';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF8F5; margin: 0; padding: 24px; color: #2B2623;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #EAE3DC; overflow: hidden; box-shadow: 0 4px 12px rgba(43,38,35,0.05);">
    <div style="background: #C85A32; padding: 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Kumor Para</h1>
      <p style="color: #F8D8CE; margin: 4px 0 0 0; font-size: 12px;">Independent Indian Artisans Marketplace</p>
    </div>
    <div style="padding: 32px 24px;">
      <p style="font-size: 15px; margin: 0 0 16px 0;">${greeting}</p>
      <p style="font-size: 14px; line-height: 1.6; color: #574F4A; margin: 0 0 24px 0;">
        Use the following one-time verification code for ${actionText}. This code will expire in <strong>5 minutes</strong>.
      </p>
      <div style="background: #FAF8F5; border: 2px dashed #C85A32; border-radius: 16px; padding: 18px; text-align: center; margin-bottom: 24px;">
        <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #C85A32;">
          ${params.otp}
        </span>
      </div>
      <p style="font-size: 12px; line-height: 1.5; color: #857A73; margin: 0;">
        If you did not request this verification code, please ignore this email or contact security support immediately. Never share this code with anyone.
      </p>
    </div>
    <div style="background: #F4EFEA; padding: 16px; text-align: center; font-size: 11px; color: #857A73; border-top: 1px solid #EAE3DC;">
      &copy; ${new Date().getFullYear()} Kumor Para Marketplace Pvt Ltd. Handcrafted with reverence in India.
    </div>
  </div>
</body>
</html>
    `.trim();

    const textBody = `${greeting}\n\nYour Kumor Para verification code is: ${params.otp}\nValid for 5 minutes.\nDo not share this code with anyone.`;

    try {
      const response = await resend.emails.send({
        from: this.fromEmail,
        to: params.email,
        subject,
        text: textBody,
        html,
      });

      if (response.error) {
        console.error(
          `[EmailOtpProvider] Resend API error for ${params.email}:`,
          response.error.message
        );
        throw new AppError(
          `Failed to deliver Email verification code via Resend: ${response.error.message}`,
          502
        );
      }

      const messageId = response.data?.id;

      console.log(
        `[EmailOtpProvider] Real Email OTP dispatched to ${params.email} via Resend (Message ID: ${messageId || 'ok'})`
      );

      return {
        success: true,
        messageId,
        provider: 'resend',
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      console.error(
        `[EmailOtpProvider] Resend delivery exception for ${params.email}:`,
        err.message
      );
      throw new AppError(
        `Failed to deliver Email verification code: ${err.message || 'Resend service error'}. Please check your RESEND_API_KEY in server environment.`,
        502
      );
    }
  }
}
