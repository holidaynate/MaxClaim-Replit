import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@maxclaim.com';
const APP_NAME = 'MaxClaim';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('[EmailService] SendGrid configured');
} else {
  console.log('[EmailService] SendGrid API key not configured - emails will be logged only');
}

interface EmailResult {
  success: boolean;
  message: string;
  logged?: boolean;
}

function getBaseUrl(): string {
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return process.env.BASE_URL || 'http://localhost:5000';
}

export async function sendPasswordResetEmail(
  email: string, 
  token: string, 
  userType: string
): Promise<EmailResult> {
  const resetLink = `${getBaseUrl()}/reset-password?token=${token}`;
  
  const subject = `Reset Your ${APP_NAME} Password`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 40px; border: 1px solid #334155;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="background: linear-gradient(to right, #38bdf8, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin: 0;">MaxClaim</h1>
          <p style="color: #94a3b8; margin-top: 8px;">Fair Market Value Claims</p>
        </div>
        
        <h2 style="color: #f1f5f9; font-size: 20px; margin-bottom: 20px;">Password Reset Request</h2>
        
        <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
          We received a request to reset the password for your ${userType} account associated with this email address.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; background: linear-gradient(to right, #0ea5e9, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Reset Your Password
          </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          This link will expire in <strong>1 hour</strong>. If you didn't request this reset, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${resetLink}" style="color: #38bdf8; word-break: break-all;">${resetLink}</a>
        </p>
        
        <p style="color: #475569; font-size: 11px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} MaxClaim. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  if (!SENDGRID_API_KEY) {
    console.log(`[EmailService] Password reset email would be sent to: ${email}`);
    console.log(`[EmailService] Reset link: ${resetLink}`);
    return { success: true, message: 'Email logged (SendGrid not configured)', logged: true };
  }

  try {
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject,
      html,
    });
    console.log(`[EmailService] Password reset email sent to: ${email}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error: any) {
    console.error('[EmailService] Failed to send password reset email:', error.message);
    return { success: false, message: error.message };
  }
}

export async function sendEmailVerificationEmail(
  email: string, 
  token: string, 
  userType: string,
  userName?: string
): Promise<EmailResult> {
  const verifyLink = `${getBaseUrl()}/verify-email?token=${token}`;
  
  const subject = `Verify Your ${APP_NAME} Email`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 40px; border: 1px solid #334155;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="background: linear-gradient(to right, #38bdf8, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin: 0;">MaxClaim</h1>
          <p style="color: #94a3b8; margin-top: 8px;">Fair Market Value Claims</p>
        </div>
        
        <h2 style="color: #f1f5f9; font-size: 20px; margin-bottom: 20px;">Welcome${userName ? `, ${userName}` : ''}!</h2>
        
        <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
          Thank you for creating a ${userType} account with MaxClaim. Please verify your email address to complete your registration.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyLink}" style="display: inline-block; background: linear-gradient(to right, #0ea5e9, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Verify Email Address
          </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          This link will expire in <strong>1 hour</strong>. If you didn't create this account, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;">
        
        <p style="color: #64748b; font-size: 12px; text-align: center;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          <a href="${verifyLink}" style="color: #38bdf8; word-break: break-all;">${verifyLink}</a>
        </p>
        
        <p style="color: #475569; font-size: 11px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} MaxClaim. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  if (!SENDGRID_API_KEY) {
    console.log(`[EmailService] Verification email would be sent to: ${email}`);
    console.log(`[EmailService] Verify link: ${verifyLink}`);
    return { success: true, message: 'Email logged (SendGrid not configured)', logged: true };
  }

  try {
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject,
      html,
    });
    console.log(`[EmailService] Verification email sent to: ${email}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error: any) {
    console.error('[EmailService] Failed to send verification email:', error.message);
    return { success: false, message: error.message };
  }
}

export async function sendWelcomeEmail(
  email: string,
  userType: string,
  userName?: string
): Promise<EmailResult> {
  const dashboardLink = userType === 'agent' 
    ? `${getBaseUrl()}/agent-dashboard` 
    : `${getBaseUrl()}/partner-dashboard`;
  
  const subject = `Welcome to ${APP_NAME}!`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; color: #e2e8f0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 40px; border: 1px solid #334155;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="background: linear-gradient(to right, #38bdf8, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 32px; margin: 0;">MaxClaim</h1>
          <p style="color: #94a3b8; margin-top: 8px;">Fair Market Value Claims</p>
        </div>
        
        <h2 style="color: #f1f5f9; font-size: 20px; margin-bottom: 20px;">Welcome to MaxClaim${userName ? `, ${userName}` : ''}!</h2>
        
        <p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 20px;">
          Your ${userType === 'agent' ? 'advocate' : userType} account has been verified and is ready to use. We're excited to have you on board!
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(to right, #0ea5e9, #8b5cf6); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
            Go to Dashboard
          </a>
        </div>
        
        <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">
          ${userType === 'agent' 
            ? 'Start referring partners as an advocate and earn commissions of 15-40% on their subscriptions!' 
            : 'Start advertising to homeowners with insurance claims in your area!'}
        </p>
        
        <hr style="border: none; border-top: 1px solid #334155; margin: 30px 0;">
        
        <p style="color: #475569; font-size: 11px; text-align: center; margin-top: 20px;">
          © ${new Date().getFullYear()} MaxClaim. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  if (!SENDGRID_API_KEY) {
    console.log(`[EmailService] Welcome email would be sent to: ${email}`);
    return { success: true, message: 'Email logged (SendGrid not configured)', logged: true };
  }

  try {
    await sgMail.send({
      to: email,
      from: FROM_EMAIL,
      subject,
      html,
    });
    console.log(`[EmailService] Welcome email sent to: ${email}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error: any) {
    console.error('[EmailService] Failed to send welcome email:', error.message);
    return { success: false, message: error.message };
  }
}
