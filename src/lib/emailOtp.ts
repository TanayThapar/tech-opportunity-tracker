import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { getNotificationConfig } from './notifications';

/**
 * Generates a secure, cryptographically random 6-digit numeric OTP.
 */
export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export interface SendOtpResult {
  sent: boolean;
  devOtp?: string;
  error?: string;
}

/**
 * Sends a 6-digit OTP verification email.
 * If SMTP credentials are not configured or in local/test mode,
 * logs the OTP safely and provides it for local testing so users are never locked out.
 */
export async function sendOtpEmail(
  email: string,
  otp: string,
  name: string
): Promise<SendOtpResult> {
  const config = getNotificationConfig();

  if (config.smtpHost && config.smtpUser) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });

      await transporter.sendMail({
        from: config.smtpFrom,
        to: email,
        subject: `Your Opportunity Radar Verification Code: ${otp}`,
        text: `Hello ${name},\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes. If you did not request this, please ignore this email.\n\nOpportunity Radar`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #1e293b; background: #0c1015; color: #e2e8f0; border-radius: 14px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 20px;">
              <div style="background: #a3e635; color: #0c1015; font-weight: bold; padding: 4px 10px; border-radius: 6px; font-size: 14px; display: inline-block;">
                RADAR
              </div>
              <span style="font-size: 16px; font-weight: bold; color: #ffffff;">Opportunity Radar</span>
            </div>
            <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 600;">Confirm Your Email Address</h2>
            <p style="font-size: 14px; color: #94a3b8; line-height: 1.5;">
              Hello <strong style="color: #ffffff;">${name}</strong>, use the 6-digit verification code below to complete your registration and activate your account:
            </p>
            <div style="background: #111620; border: 1px solid #334155; border-radius: 10px; padding: 18px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-family: monospace; letter-spacing: 8px; font-weight: 700; color: #a3e635;">
                ${otp}
              </span>
            </div>
            <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 0;">
              This code will expire in <strong>10 minutes</strong>. If you did not create an account on Opportunity Radar, you can safely ignore this email.
            </p>
          </div>
        `,
      });

      return { sent: true };
    } catch (err: any) {
      console.error('Failed to dispatch OTP email via SMTP:', err);
      return { sent: false, devOtp: otp, error: err.message };
    }
  }

  // Fallback: SMTP not configured in environment
  console.log(`[AUTH OTP] Simulated email verification code for ${email}: ${otp}`);
  return { sent: false, devOtp: otp };
}
