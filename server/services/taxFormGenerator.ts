/**
 * Tax Form Generator Service
 * Generates 1099-NEC forms for partner payouts exceeding $600
 * 
 * Note: In production, this would integrate with a tax compliance service
 * like Stripe Tax, Tax1099.com, or similar for actual IRS filing.
 */

import { db } from "../db";
import { taxForms, partners, partnerLeads } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { jsPDF } from "jspdf";

interface Form1099NECData {
  partnerId: string;
  taxYear: number;
  recipientInfo: {
    name: string;
    tin?: string; // Tax ID - would be encrypted in production
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  payerInfo: {
    name: string;
    tin: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
  box1NonemployeeCompensation: number;
  box4FederalTaxWithheld: number;
  box5StateTaxWithheld: number;
  box6StateIncome: number;
  statePayerNo?: string;
}

const PAYER_INFO = {
  name: "MaxClaim / Royal RC Inc",
  tin: "XX-XXXXXXX", // Replace with actual EIN in production
  address: "123 Main Street",
  city: "Austin",
  state: "TX",
  zip: "78701",
};

const MINIMUM_THRESHOLD = 600; // IRS 1099-NEC threshold

/**
 * Check if a partner requires a 1099-NEC for a given tax year
 */
export async function checkForm1099Requirement(
  partnerId: string,
  taxYear: number
): Promise<{ required: boolean; totalCompensation: number; reason: string }> {
  const [totals] = await db.select({
    totalPaid: sql<number>`COALESCE(SUM(commission_amount), 0)`,
    paidCount: sql<number>`COUNT(*)`,
  }).from(partnerLeads)
    .where(and(
      eq(partnerLeads.partnerId, partnerId),
      eq(partnerLeads.status, "paid"),
      sql`EXTRACT(YEAR FROM paid_at) = ${taxYear}`
    ));

  const totalCompensation = Number(totals?.totalPaid) || 0;

  if (totalCompensation >= MINIMUM_THRESHOLD) {
    return {
      required: true,
      totalCompensation,
      reason: `Total compensation of $${totalCompensation.toFixed(2)} exceeds $${MINIMUM_THRESHOLD} threshold`,
    };
  }

  return {
    required: false,
    totalCompensation,
    reason: `Total compensation of $${totalCompensation.toFixed(2)} is below $${MINIMUM_THRESHOLD} threshold`,
  };
}

/**
 * Generate 1099-NEC form data for a partner
 */
export async function generateForm1099NEC(
  partnerId: string,
  taxYear: number
): Promise<{ success: boolean; form?: Form1099NECData; taxFormId?: string; pdfBase64?: string; error?: string }> {
  // Check if form is required
  const requirement = await checkForm1099Requirement(partnerId, taxYear);
  if (!requirement.required) {
    return {
      success: false,
      error: requirement.reason,
    };
  }

  // Get partner info
  const [partner] = await db.select().from(partners).where(eq(partners.id, partnerId));
  if (!partner) {
    return { success: false, error: "Partner not found" };
  }

  // Check for existing form
  const [existingForm] = await db.select().from(taxForms)
    .where(and(
      eq(taxForms.partnerId, partnerId),
      eq(taxForms.taxYear, taxYear),
      eq(taxForms.formType, "1099-NEC")
    ));

  if (existingForm) {
    return {
      success: false,
      error: `1099-NEC already generated for tax year ${taxYear}`,
    };
  }

  // Build form data
  const formData: Form1099NECData = {
    partnerId,
    taxYear,
    recipientInfo: {
      name: partner.companyName,
      // TIN would be collected during partner onboarding
      // and stored encrypted
    },
    payerInfo: PAYER_INFO,
    box1NonemployeeCompensation: requirement.totalCompensation,
    box4FederalTaxWithheld: 0, // No backup withholding by default
    box5StateTaxWithheld: 0,
    box6StateIncome: requirement.totalCompensation,
  };

  // Generate PDF
  const pdfBuffer = generateForm1099NECPdf(formData);

  // Store form record with PDF
  const [taxForm] = await db.insert(taxForms).values({
    partnerId,
    formType: "1099-NEC",
    taxYear,
    totalCompensation: requirement.totalCompensation,
    formData: {
      recipientName: partner.companyName,
      payerInfo: PAYER_INFO,
    },
    pdfData: pdfBuffer.toString("base64"),
  }).returning();

  return {
    success: true,
    form: formData,
    taxFormId: taxForm.id,
    pdfBase64: pdfBuffer.toString("base64"),
  };
}

/**
 * Generate 1099-NEC PDF document using jsPDF
 */
function generateForm1099NECPdf(formData: Form1099NECData): Buffer {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FORM 1099-NEC", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Nonemployee Compensation", 105, 28, { align: "center" });
  doc.text(`Tax Year ${formData.taxYear}`, 105, 35, { align: "center" });
  
  // OMB notice
  doc.setFontSize(8);
  doc.text("OMB No. 1545-0116", 180, 15);
  
  // Draw boxes
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  
  // Payer box (left column)
  doc.rect(10, 45, 95, 50);
  doc.setFontSize(7);
  doc.text("PAYER'S name, street address, city or town, state or province,", 12, 50);
  doc.text("country, ZIP or foreign postal code, and telephone no.", 12, 54);
  
  doc.setFontSize(9);
  doc.text(formData.payerInfo.name, 12, 62);
  doc.text(formData.payerInfo.address, 12, 67);
  doc.text(`${formData.payerInfo.city}, ${formData.payerInfo.state} ${formData.payerInfo.zip}`, 12, 72);
  
  // Payer TIN box
  doc.rect(10, 95, 47, 15);
  doc.setFontSize(7);
  doc.text("PAYER'S TIN", 12, 100);
  doc.setFontSize(9);
  doc.text(formData.payerInfo.tin, 12, 107);
  
  // Recipient TIN box
  doc.rect(57, 95, 48, 15);
  doc.setFontSize(7);
  doc.text("RECIPIENT'S TIN", 59, 100);
  doc.setFontSize(9);
  doc.text(formData.recipientInfo.tin || "___-__-____", 59, 107);
  
  // Recipient name box
  doc.rect(10, 110, 95, 20);
  doc.setFontSize(7);
  doc.text("RECIPIENT'S name", 12, 115);
  doc.setFontSize(9);
  doc.text(formData.recipientInfo.name, 12, 123);
  
  // Recipient address box
  doc.rect(10, 130, 95, 25);
  doc.setFontSize(7);
  doc.text("Street address (including apt. no.)", 12, 135);
  doc.setFontSize(9);
  doc.text(formData.recipientInfo.address || "", 12, 143);
  doc.text(
    `${formData.recipientInfo.city || ""}, ${formData.recipientInfo.state || ""} ${formData.recipientInfo.zip || ""}`, 
    12, 150
  );
  
  // Right column - Boxes 1-7
  const rightX = 110;
  const boxWidth = 45;
  const boxHeight = 18;
  
  // Box 1 - Nonemployee compensation
  doc.rect(rightX, 45, boxWidth, boxHeight);
  doc.setFontSize(7);
  doc.text("1 Nonemployee compensation", rightX + 2, 50);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`$${formData.box1NonemployeeCompensation.toFixed(2)}`, rightX + 5, 58);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  
  // Box 2 - Payer made direct sales
  doc.rect(rightX + boxWidth, 45, boxWidth, boxHeight);
  doc.text("2 Payer made direct sales", rightX + boxWidth + 2, 50);
  doc.text("totaling $5,000 or more", rightX + boxWidth + 2, 55);
  
  // Box 3 - reserved
  doc.rect(rightX, 63, boxWidth, boxHeight);
  doc.text("3 (Reserved)", rightX + 2, 68);
  
  // Box 4 - Federal income tax withheld
  doc.rect(rightX + boxWidth, 63, boxWidth, boxHeight);
  doc.text("4 Federal income tax withheld", rightX + boxWidth + 2, 68);
  doc.setFontSize(9);
  doc.text(`$${formData.box4FederalTaxWithheld.toFixed(2)}`, rightX + boxWidth + 5, 76);
  
  // Box 5-7 - State information
  doc.setFontSize(7);
  doc.rect(rightX, 81, 90, 20);
  doc.text("5 State tax withheld", rightX + 2, 86);
  doc.text("6 State/Payer's state no.", rightX + 32, 86);
  doc.text("7 State income", rightX + 62, 86);
  
  doc.setFontSize(9);
  doc.text(`$${formData.box5StateTaxWithheld.toFixed(2)}`, rightX + 2, 95);
  doc.text(formData.statePayerNo || "", rightX + 32, 95);
  doc.text(`$${formData.box6StateIncome.toFixed(2)}`, rightX + 62, 95);
  
  // Footer
  doc.setFontSize(7);
  doc.text("Form 1099-NEC (Rev. 1-2022)", 10, 170);
  doc.text("Cat. No. 72590N", 10, 175);
  doc.text("Department of the Treasury - Internal Revenue Service", 10, 180);
  
  // Copy designation
  doc.setFontSize(10);
  doc.text("Copy B - For Recipient", 105, 170, { align: "center" });
  doc.setFontSize(8);
  doc.text("This is important tax information and is being furnished to the", 105, 177, { align: "center" });
  doc.text("IRS. If you are required to file a return, a negligence penalty or", 105, 182, { align: "center" });
  doc.text("other sanction may be imposed on you if this income is taxable", 105, 187, { align: "center" });
  doc.text("and the IRS determines that it has not been reported.", 105, 192, { align: "center" });
  
  // Get PDF as buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

/**
 * Get all partners requiring 1099-NEC for a tax year
 */
export async function getPartnersRequiring1099(
  taxYear: number
): Promise<Array<{ partnerId: string; companyName: string; totalCompensation: number }>> {
  const results = await db.select({
    partnerId: partnerLeads.partnerId,
    companyName: partners.companyName,
    totalCompensation: sql<number>`COALESCE(SUM(${partnerLeads.commissionAmount}), 0)`,
  })
    .from(partnerLeads)
    .innerJoin(partners, eq(partners.id, partnerLeads.partnerId))
    .where(and(
      eq(partnerLeads.status, "paid"),
      sql`EXTRACT(YEAR FROM ${partnerLeads.paidAt}) = ${taxYear}`
    ))
    .groupBy(partnerLeads.partnerId, partners.companyName)
    .having(sql`SUM(${partnerLeads.commissionAmount}) >= ${MINIMUM_THRESHOLD}`);

  return results.map(r => ({
    partnerId: r.partnerId,
    companyName: r.companyName || "Unknown",
    totalCompensation: Number(r.totalCompensation),
  }));
}

/**
 * Generate all required 1099-NEC forms for a tax year
 */
export async function generateAllForms1099(
  taxYear: number
): Promise<{ generated: number; skipped: number; errors: string[] }> {
  const partnersNeedingForms = await getPartnersRequiring1099(taxYear);
  
  let generated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const partner of partnersNeedingForms) {
    const result = await generateForm1099NEC(partner.partnerId, taxYear);
    if (result.success) {
      generated++;
    } else {
      if (result.error?.includes("already generated")) {
        skipped++;
      } else {
        errors.push(`${partner.companyName}: ${result.error}`);
      }
    }
  }

  console.log(`[TaxFormGenerator] Generated ${generated} 1099-NEC forms for ${taxYear}, skipped ${skipped}`);
  return { generated, skipped, errors };
}

/**
 * Get tax form generation status
 */
export function getStatus() {
  return {
    minimumThreshold: MINIMUM_THRESHOLD,
    payerInfo: {
      name: PAYER_INFO.name,
      address: `${PAYER_INFO.city}, ${PAYER_INFO.state}`,
    },
    supportedForms: ["1099-NEC"],
    integrations: {
      irsFiling: false, // Would integrate with Tax1099.com or similar
      pdfGeneration: true,
    },
  };
}
