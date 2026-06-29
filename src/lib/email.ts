import nodemailer from 'nodemailer';

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your .env file.'
    );
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

const fromName = process.env.SMTP_FROM_NAME || 'Inshop';
const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@inshop.co.tz';

export async function sendVerificationCode(email: string, code: string, userName: string): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: 'Verify Your Email - Inshop',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
        <h2 style="color: #1e293b; margin: 0 0 8px;">Welcome to Inshop!</h2>
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          Hi <strong>${userName}</strong>, please verify your email address to activate your account.
        </p>
        <div style="text-align: center; background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Your verification code</div>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3b82f6;">${code}</div>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">
          This code expires in 10 minutes. If you did not create this account, please ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetCode(email: string, code: string, userName: string): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: 'Reset Your Password - Inshop',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
        <h2 style="color: #1e293b; margin: 0 0 8px;">Password Reset Request</h2>
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          Hi <strong>${userName}</strong>, use the code below to reset your password. It expires in 10 minutes.
        </p>
        <div style="text-align: center; background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">Your reset code</div>
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f59e0b;">${code}</div>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });
}

export async function sendDeletionCode(email: string, code: string, shopName: string): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Shop Data Deletion Code - ${shopName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
        <h2 style="color: #dc2626; margin: 0 0 8px;">⚠ Data Deletion Request</h2>
        <p style="color: #374151; font-size: 14px; margin: 0 0 16px;">
          A request was made to delete all data for <strong>${shopName}</strong>. 
          Use the code below to confirm. This code expires in 10 minutes.
        </p>
        <div style="text-align: center; background: #fff; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #dc2626;">${code}</div>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin: 16px 0 0;">
          If you did not request this, please ignore this email or contact support.
        </p>
      </div>
    `,
  });
}
