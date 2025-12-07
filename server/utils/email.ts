// Reference: SendGrid email integration from user prompts
import sgMail from "@sendgrid/mail";

// Initialize SendGrid if API key is available
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

if (!SENDGRID_API_KEY) {
  console.warn("WARN: SENDGRID_API_KEY not set, email functionality disabled");
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.SENDGRID_FROM || "no-reply@maxclaim.com";

interface EmailAttachment {
  content: string; // base64 encoded
  filename: string;
  type: string;
  disposition?: "attachment" | "inline";
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
}

/**
 * Generic transactional email sender.
 * Fire-and-forget pattern - logs errors but doesn't throw.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments = [],
}: SendEmailOptions): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log(`Email not sent (no API key): ${subject} to ${to}`);
    return false;
  }

  const msg = {
    to,
    from: FROM_EMAIL,
    subject,
    text,
    html: html || `<p>${text.replace(/\n/g, "<br>")}</p>`,
    attachments: attachments.map((att) => ({
      content: att.content,
      filename: att.filename,
      type: att.type,
      disposition: att.disposition || "attachment",
    })),
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent: ${subject} to ${to}`);
    return true;
  } catch (err: any) {
    console.error("SendGrid error:", err.message);
    if (err.response?.body) {
      console.error("SendGrid response:", err.response.body);
    }
    return false;
  }
}

/**
 * Send claim report email with optional PDF attachment.
 * Uses fire-and-forget pattern.
 */
export async function sendClaimReportEmail({
  to,
  reportUrl,
  claimSummary,
  pdfBuffer,
}: {
  to: string;
  reportUrl?: string;
  claimSummary: string;
  pdfBuffer?: Buffer;
}): Promise<boolean> {
  const subject = "Your MaxClaim Fair Market Value Report";
  
  const text = [
    "Your fair market value report is ready.",
    "",
    `Summary: ${claimSummary}`,
    "",
    reportUrl ? `View or download your report: ${reportUrl}` : "",
    "",
    "This report compares your insurance settlement offer against real-time fair market values.",
    "",
    "If you have questions about your claim, consider consulting with a licensed public adjuster.",
    "",
    "Best regards,",
    "The MaxClaim Team",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #0ea5e9;">Your Fair Market Value Report</h2>
      <p>Your fair market value report is ready.</p>
      <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <strong>Summary:</strong> ${claimSummary}
      </div>
      ${reportUrl ? `<p><a href="${reportUrl}" style="color: #0ea5e9;">View or download your report</a></p>` : ""}
      <p style="color: #64748b; font-size: 14px;">
        This report compares your insurance settlement offer against real-time fair market values.
        If you have questions about your claim, consider consulting with a licensed public adjuster.
      </p>
      <hr style="border: 1px solid #e2e8f0; margin: 24px 0;">
      <p style="color: #94a3b8; font-size: 12px;">
        MaxClaim - Consumer Advocacy Tool<br>
        This is an informational tool only and does not constitute legal or financial advice.
      </p>
    </div>
  `;

  const attachments: EmailAttachment[] = [];
  if (pdfBuffer) {
    attachments.push({
      content: pdfBuffer.toString("base64"),
      filename: "maxclaim-report.pdf",
      type: "application/pdf",
      disposition: "attachment",
    });
  }

  return sendEmail({
    to,
    subject,
    text,
    html,
    attachments,
  });
}

/**
 * Send partner lead notification email.
 * Notifies partner when a user clicks through to their listing.
 */
export async function sendPartnerLeadEmail({
  partnerEmail,
  partnerName,
  userZipCode,
  claimCategory,
}: {
  partnerEmail: string;
  partnerName: string;
  userZipCode: string;
  claimCategory?: string;
}): Promise<boolean> {
  const subject = "New Lead from MaxClaim";
  
  const text = [
    `Hello ${partnerName},`,
    "",
    "A user from MaxClaim is interested in your services.",
    "",
    `ZIP Code: ${userZipCode}`,
    claimCategory ? `Claim Category: ${claimCategory}` : "",
    "",
    "Please follow up promptly to provide the best service.",
    "",
    "Best regards,",
    "The MaxClaim Team",
  ].filter(Boolean).join("\n");

  return sendEmail({
    to: partnerEmail,
    subject,
    text,
  });
}

/**
 * Check if email service is available.
 */
export function isEmailEnabled(): boolean {
  return !!SENDGRID_API_KEY;
}
