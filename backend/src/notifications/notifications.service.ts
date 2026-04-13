import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: false,
      auth: {
        user: this.configService.get<string>('email.user'),
        pass: this.configService.get<string>('email.pass'),
      },
    });
  }

  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"CoverAI" <${this.configService.get<string>('email.from')}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err.message}`);
      throw err;
    }
  }

  async sendEmailVerification(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const verifyUrl = `${frontendUrl}/auth/verify-email?token=${token}`;

    await this.sendEmail(
      email,
      'Verify your CoverAI account',
      this.emailVerificationTemplate(name, verifyUrl),
    );
  }

  async sendPasswordReset(email: string, name: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('app.frontendUrl');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    await this.sendEmail(
      email,
      'Reset your CoverAI password',
      this.passwordResetTemplate(name, resetUrl),
    );
  }

  async sendPolicyActivated(
    email: string,
    name: string,
    policyDetails: {
      policyNumber: string;
      policyName: string;
      premiumPaid: number;
      expiresAt: Date;
    },
  ): Promise<void> {
    await this.sendEmail(
      email,
      `🎉 Your policy ${policyDetails.policyNumber} is now active!`,
      this.policyActivatedTemplate(name, policyDetails),
    );
  }

  async sendPaymentReceipt(
    email: string,
    name: string,
    receiptDetails: {
      paymentId: string;
      amount: number;
      policyName: string;
      paidAt: Date;
    },
  ): Promise<void> {
    await this.sendEmail(
      email,
      `Payment Receipt - ₹${receiptDetails.amount}`,
      this.paymentReceiptTemplate(name, receiptDetails),
    );
  }

  async sendPolicyRenewalReminder(
    email: string,
    name: string,
    policyDetails: { policyNumber: string; policyName: string; expiresAt: Date; daysLeft: number },
  ): Promise<void> {
    await this.sendEmail(
      email,
      `⚠️ Your policy expires in ${policyDetails.daysLeft} days`,
      this.renewalReminderTemplate(name, policyDetails),
    );
  }

  // ── Email Templates ──────────────────────────────────────────────────────

  private baseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Inter, -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; }
    .body { padding: 32px; }
    .body p { color: #374151; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #7c3aed, #2563eb); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin: 16px 0; }
    .info-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e2e8f0; }
    .info-row:last-child { border-bottom: none; }
    .footer { background: #f8fafc; padding: 24px; text-align: center; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CoverAI</h1>
      <p>Your trusted insurance partner</p>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} CoverAI. All rights reserved.</p>
      <p>If you didn't request this email, please ignore it.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private emailVerificationTemplate(name: string, verifyUrl: string): string {
    return this.baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Welcome to CoverAI! Please verify your email address to get started.</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      </div>
      <p>This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
    `);
  }

  private passwordResetTemplate(name: string, resetUrl: string): string {
    return this.baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>We received a request to reset your CoverAI password. Click the button below to create a new password:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${resetUrl}" class="btn">Reset Password</a>
      </div>
      <p>This link expires in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
    `);
  }

  private policyActivatedTemplate(name: string, details: any): string {
    return this.baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Great news! Your insurance policy has been activated successfully. Here are your policy details:</p>
      <div class="info-box">
        <div class="info-row"><span><strong>Policy Number</strong></span><span>${details.policyNumber}</span></div>
        <div class="info-row"><span><strong>Policy Name</strong></span><span>${details.policyName}</span></div>
        <div class="info-row"><span><strong>Premium Paid</strong></span><span>₹${details.premiumPaid.toLocaleString('en-IN')}</span></div>
        <div class="info-row"><span><strong>Valid Until</strong></span><span>${new Date(details.expiresAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
      </div>
      <p>You can view and manage your policy anytime from your <strong>CoverAI dashboard</strong>. Keep this policy number safe — you'll need it for claims.</p>
      <p>Thank you for choosing CoverAI! 🎉</p>
    `);
  }

  private paymentReceiptTemplate(name: string, details: any): string {
    return this.baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>Your payment has been processed successfully. Here's your receipt:</p>
      <div class="info-box">
        <div class="info-row"><span><strong>Payment ID</strong></span><span>${details.paymentId}</span></div>
        <div class="info-row"><span><strong>Policy</strong></span><span>${details.policyName}</span></div>
        <div class="info-row"><span><strong>Amount Paid</strong></span><span>₹${details.amount.toLocaleString('en-IN')}</span></div>
        <div class="info-row"><span><strong>Date</strong></span><span>${new Date(details.paidAt).toLocaleString('en-IN')}</span></div>
      </div>
      <p>Please save this receipt for your records. Your policy will be activated shortly.</p>
    `);
  }

  private renewalReminderTemplate(name: string, details: any): string {
    return this.baseTemplate(`
      <p>Hi <strong>${name}</strong>,</p>
      <p>This is a friendly reminder that your insurance policy is expiring soon.</p>
      <div class="info-box">
        <div class="info-row"><span><strong>Policy Number</strong></span><span>${details.policyNumber}</span></div>
        <div class="info-row"><span><strong>Policy Name</strong></span><span>${details.policyName}</span></div>
        <div class="info-row"><span><strong>Expiry Date</strong></span><span>${new Date(details.expiresAt).toLocaleDateString('en-IN')}</span></div>
        <div class="info-row"><span><strong>Days Remaining</strong></span><span style="color: #ef4444; font-weight: bold;">${details.daysLeft} days</span></div>
      </div>
      <p>To avoid a lapse in coverage, please renew your policy before it expires.</p>
    `);
  }
}
