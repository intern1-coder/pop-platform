import { Injectable, Logger } from '@nestjs/common';

export interface EmailMessage {
  to: string;
  subject: string;
  bodyText: string;
}

// Best-effort notification dispatcher. There is no SMTP transport configured
// for the MVP, so sends are logged and always resolve — business logic never
// breaks because an email failed. Wire a transport here later.
@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  async sendEmail(message: EmailMessage): Promise<void> {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost) {
      this.logger.log(`[email skipped - no SMTP transport] to=${message.to} subject=${message.subject}`);
      return;
    }
    // TODO: plug in nodemailer/SES/SendGrid once SMTP_HOST/SMTP_USER/SMTP_PASS are provided.
    this.logger.log(`[email queued] to=${message.to} subject=${message.subject}`);
  }
}
