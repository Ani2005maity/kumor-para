export interface SendEmailOtpParams {
  email: string;
  otp: string;
  purpose: 'registration' | 'login' | 'password_reset';
  userName?: string;
}

export interface SendSmsOtpParams {
  phone: string;
  otp: string;
  purpose: 'registration' | 'login' | 'password_reset';
  userName?: string;
}

export interface OtpSendResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

export interface IEmailOtpProvider {
  sendEmailOtp(params: SendEmailOtpParams): Promise<OtpSendResult>;
}

export interface ISmsOtpProvider {
  sendSmsOtp(params: SendSmsOtpParams): Promise<OtpSendResult>;
}
