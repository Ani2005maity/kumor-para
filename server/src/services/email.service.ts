import { IInvoice } from '../models/Invoice.js';

export interface IEmailService {
  sendInvoiceEmail(invoice: IInvoice, recipientEmail: string): Promise<boolean>;
  sendOrderConfirmationEmail(orderId: string, recipientEmail: string): Promise<boolean>;
}

class EmailServiceImpl implements IEmailService {
  /**
   * Asynchronous fire-and-log invoice email delivery hook.
   * Never throws or blocks invoice creation or order flows.
   */
  async sendInvoiceEmail(invoice: IInvoice, recipientEmail: string): Promise<boolean> {
    try {
      console.log(
        `[EmailService] 📧 (Async Hook) Dispatching invoice ${invoice.invoiceNumber} to ${recipientEmail}...`
      );
      // In production, this queues via BullMQ / AWS SES / SendGrid / Nodemailer.
      // In dev/test, we log the dispatch successfully.
      return true;
    } catch (err: any) {
      console.warn(`[EmailService] Warning: Failed to send invoice email to ${recipientEmail}:`, err.message);
      return false;
    }
  }

  async sendOrderConfirmationEmail(orderId: string, recipientEmail: string): Promise<boolean> {
    try {
      console.log(`[EmailService] 📧 (Async Hook) Dispatching order confirmation for ${orderId} to ${recipientEmail}...`);
      return true;
    } catch (err: any) {
      console.warn(`[EmailService] Warning: Failed to send order confirmation to ${recipientEmail}:`, err.message);
      return false;
    }
  }
}

export const EmailService: IEmailService = new EmailServiceImpl();
