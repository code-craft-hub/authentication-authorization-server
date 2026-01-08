import nodemailer from 'nodemailer';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    });
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    try {
      const verificationUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
      
      await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: 'Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome! Please verify your email address</h2>
            <p>Click the button below to verify your email address:</p>
            <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Verify Email
            </a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6B7280;">${verificationUrl}</p>
            <p style="margin-top: 30px; color: #6B7280; font-size: 14px;">This link will expire in 24 hours.</p>
          </div>
        `,
      });

      logger.info(`Verification email sent to ${to}`);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    try {
      const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
      
      await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to proceed:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              Reset Password
            </a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6B7280;">${resetUrl}</p>
            <p style="margin-top: 30px; color: #EF4444; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            <p style="color: #6B7280; font-size: 14px;">This link will expire in 1 hour.</p>
          </div>
        `,
      });

      logger.info(`Password reset email sent to ${to}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  async sendReferralBonusEmail(to: string, amount: number, isMilestone: boolean): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: isMilestone ? '🎉 Milestone Bonus Earned!' : '💰 Referral Bonus Earned!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>${isMilestone ? '🎉 Congratulations! Milestone Reached!' : '💰 You Earned a Referral Bonus!'}</h2>
            <p>You've earned <strong>${amount} credits</strong> ${isMilestone ? 'for reaching a referral milestone' : 'from a successful referral'}!</p>
            <p>Keep sharing your referral code to earn even more rewards.</p>
            <a href="${env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
              View Dashboard
            </a>
          </div>
        `,
      });

      logger.info(`Referral bonus email sent to ${to}`);
    } catch (error) {
      logger.error('Failed to send referral bonus email:', error);
    }
  }
}

export const emailService = new EmailService();