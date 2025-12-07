import { storage } from "../storage";

// Pro Organizations data from the MaxClaim Pro Orgs Database
const proOrganizationsData = [
  // General Contractors - National
  {
    name: "Associated General Contractors of America (AGC)",
    category: "general_contractors" as const,
    scope: "national" as const,
    website: "https://www.agc.org",
    memberDirectoryUrl: "https://www.agc.org/member-directory",
    notes: "National association with state/local chapters"
  },
  {
    name: "Metal Building Contractors & Erectors Association (MBCEA)",
    category: "general_contractors" as const,
    scope: "national" as const,
    website: "https://www.mbcea.org",
    memberDirectoryUrl: "https://www.mbcea.org/member-directory",
    notes: "Metal building contractors national association"
  },
  {
    name: "General Building Contractors Association (GBCA)",
    category: "general_contractors" as const,
    scope: "regional" as const,
    website: "https://gbca.com",
    memberDirectoryUrl: "https://members.gbca.com/directory",
    notes: "Regional - Philadelphia + Mid-Atlantic"
  },
  // General Contractors - State Chapters (TX)
  {
    name: "AGC - Austin Chapter",
    category: "general_contractors" as const,
    scope: "local" as const,
    state: "TX",
    city: "Austin",
    website: "https://www.agcaustin.org",
    memberDirectoryUrl: "https://members.agcaustin.org/list"
  },
  // Remodelers
  {
    name: "National Association of the Remodeling Industry (NARI)",
    category: "remodelers" as const,
    scope: "national" as const,
    website: "https://www.nari.org",
    memberDirectoryUrl: "https://www.nari.org/remodelers/Benefits-for-Members/Chapter-Membership",
    notes: "National association with local chapters"
  },
  {
    name: "NARI Dallas",
    category: "remodelers" as const,
    scope: "local" as const,
    state: "TX",
    city: "Dallas",
    website: "https://www.naridallas.org"
  },
  {
    name: "NARI Houston",
    category: "remodelers" as const,
    scope: "local" as const,
    state: "TX",
    city: "Houston",
    website: "https://www.houstonnari.org"
  },
  // Roofing Contractors
  {
    name: "National Roofing Contractors Association (NRCA)",
    category: "roofers" as const,
    scope: "national" as const,
    website: "https://www.nrca.net",
    memberDirectoryUrl: "https://www.nrca.net/roofing-contractors",
    notes: "National roofing association"
  },
  {
    name: "Western States Roofing Contractors Association (WSRCA)",
    category: "roofers" as const,
    scope: "regional" as const,
    website: "https://www.wsrca.com",
    notes: "Western US - includes TX, CA, AZ, NM, CO, etc."
  },
  {
    name: "Midwest Roofing Contractors Association (MRCA)",
    category: "roofers" as const,
    scope: "regional" as const,
    website: "https://www.mrca.org",
    notes: "Midwest region"
  },
  {
    name: "North East Roofing Contractors Association (NERCA)",
    category: "roofers" as const,
    scope: "regional" as const,
    website: "https://www.nerca.org",
    notes: "Northeast region"
  },
  {
    name: "Florida Roofing & Sheet Metal Contractors Association (FRSA)",
    category: "roofers" as const,
    scope: "state" as const,
    state: "FL",
    website: "https://www.floridaroof.com"
  },
  // Public Adjusters
  {
    name: "National Association of Public Insurance Adjusters (NAPIA)",
    category: "public_adjusters" as const,
    scope: "national" as const,
    website: "https://www.napia.com",
    memberDirectoryUrl: "https://www.napia.com/find-an-adjuster",
    notes: "National association with Find an Adjuster tool (state filter)"
  },
  {
    name: "Texas Department of Insurance (TDI)",
    category: "public_adjusters" as const,
    scope: "state" as const,
    state: "TX",
    website: "https://www.tdi.texas.gov",
    memberDirectoryUrl: "https://txapps.texas.gov/NASApp/tdi/TdiARManager",
    notes: "State licensing directory for public adjusters"
  },
  // Attorneys - State Bars
  {
    name: "State Bar of Texas",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "TX",
    website: "https://www.texasbar.com",
    memberDirectoryUrl: "https://www.texasbar.com/AM/Template.cfm?Section=Find_A_Lawyer",
    notes: "State bar association - Find a Lawyer feature for insurance law"
  },
  {
    name: "Austin Bar Association",
    category: "attorneys" as const,
    scope: "local" as const,
    state: "TX",
    city: "Austin",
    website: "https://www.austinbar.org",
    memberDirectoryUrl: "https://www.austinbar.org/?pg=FindALawyer"
  },
  {
    name: "State Bar of California",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "CA",
    website: "https://www.calbar.ca.gov",
    memberDirectoryUrl: "https://www.calbar.ca.gov/Attorneys/Find-an-Attorney",
    notes: "State bar association"
  },
  {
    name: "Florida Bar",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "FL",
    website: "https://www.floridabar.org",
    memberDirectoryUrl: "https://www.floridabar.org/directories/find-mbr/",
    notes: "State bar association"
  },
  // Disaster Recovery
  {
    name: "Federal Emergency Management Agency (FEMA)",
    category: "disaster_recovery" as const,
    scope: "national" as const,
    website: "https://www.fema.gov",
    notes: "Federal disaster recovery resources"
  },
  {
    name: "U.S. Economic Development Administration - Disaster Recovery",
    category: "disaster_recovery" as const,
    scope: "national" as const,
    website: "https://www.eda.gov/strategic-initiatives/disaster-recovery",
    notes: "Federal economic disaster recovery"
  },
  {
    name: "NAIC State Insurance Departments Hub",
    category: "disaster_recovery" as const,
    scope: "national" as const,
    website: "https://content.naic.org/state-insurance-departments",
    notes: "Hub for all state insurance department contacts"
  }
];

// Email Templates for vendor outreach
const emailTemplatesData = [
  {
    name: "Property Management Vendor Application",
    category: "vendor_outreach",
    subject: "Austin-Based All-Trades Maintenance & Roofing Vendor – Ready for Make-Readies & Repairs",
    body: `Dear [Property Manager / Maintenance Coordinator / Vendor Team],

My name is [YOUR_NAME], owner-operator of [YOUR_COMPANY] here in [CITY] ([PHONE] | [EMAIL]).

With 15+ years in commercial construction project management and hands-on experience in every trade — roofing, electrical, plumbing, HVAC, make-readies, drywall, painting, and general repairs — I'm reaching out to get added to your approved vendor list.

What I bring:
• Fully insured (GL, Workers Comp, Auto — happy to send COIs immediately)
• Local owner-operator — same-day or next-day response guaranteed
• Commercial PM background means I understand schedules, budgets, and zero-dispute billing (AIA G702/G703 experience)
• Recent apartment complex make-ready turnaround: under 24 hours on average
• Roofing is my specialty — TPO, shingle, metal, repairs, and insurance claim documentation

I'd love to help with upcoming turns, emergency repairs, or ongoing maintenance contracts. Many of my current clients are property managers who started with one make-ready and now send me steady work.

Please let me know what your onboarding process looks like — I can send insurance docs, references, and a full service/price sheet today.

Thank you for your time — looking forward to working with your team!

Best regards,

[YOUR_NAME]
Owner – [YOUR_COMPANY]
[ADDRESS]
[PHONE]
[EMAIL]
Licensed & Insured | References Available`,
    placeholders: ["YOUR_NAME", "YOUR_COMPANY", "CITY", "PHONE", "EMAIL", "ADDRESS"],
    isActive: 1
  },
  {
    name: "Public Adjuster Introduction",
    category: "vendor_outreach",
    subject: "Partnership Opportunity – MaxClaim Insurance Claim Value Tool",
    body: `Dear [ADJUSTER_NAME],

I'm reaching out from MaxClaim, a free consumer advocacy web application that helps homeowners achieve fair compensation for underpaid insurance claims.

We're building a network of trusted public adjusters to connect with homeowners who discover their claims may be significantly underpaid. Our platform compares insurance settlement offers against real-time fair market values and identifies potential additional compensation.

Partnership Benefits:
• Qualified leads from homeowners with documented underpayment evidence
• No upfront fees — commission-based referrals only
• Access to our FMV analysis tools and documentation
• Priority placement in your service area

Our users are homeowners actively researching their insurance claims and seeking professional help. We'd love to discuss how we can work together.

Would you be available for a brief call this week?

Best regards,

[YOUR_NAME]
MaxClaim Partner Relations
[EMAIL]
[PHONE]`,
    placeholders: ["ADJUSTER_NAME", "YOUR_NAME", "EMAIL", "PHONE"],
    isActive: 1
  },
  {
    name: "Roofing Contractor Partnership",
    category: "vendor_outreach",
    subject: "Lead Generation Partnership – MaxClaim Roofing Claims Platform",
    body: `Dear [CONTRACTOR_NAME],

I'm reaching out from MaxClaim, a free insurance claim advocacy tool that helps homeowners understand the true value of their roofing damage claims.

We're expanding our network of trusted roofing contractors to connect with homeowners who have:
• Documented roof damage with insurance claims
• Identified underpayment through our FMV analysis
• Are ready to move forward with repairs

Partnership Options:
• Basic listing (free) — appear in our contractor directory
• Featured placement — priority positioning for your ZIP codes
• Premium partnership — lead generation with conversion tracking

Our platform generates qualified leads from homeowners actively working on insurance claims in your area.

Would you like to learn more about joining our contractor network?

Best regards,

[YOUR_NAME]
MaxClaim Partner Relations
[EMAIL]
[PHONE]`,
    placeholders: ["CONTRACTOR_NAME", "YOUR_NAME", "EMAIL", "PHONE"],
    isActive: 1
  },
  {
    name: "Insurance Attorney Introduction",
    category: "vendor_outreach",
    subject: "Referral Partnership – Insurance Claim Disputes",
    body: `Dear [ATTORNEY_NAME],

I'm reaching out from MaxClaim regarding a potential referral partnership for insurance claim disputes.

MaxClaim is a free consumer advocacy platform that helps homeowners identify when their insurance claims are underpaid. When our analysis shows significant underpayment that may require legal intervention, we want to connect users with qualified insurance attorneys.

We're looking for attorneys who:
• Specialize in insurance bad faith or claim disputes
• Work with residential property damage cases
• Offer contingency fee arrangements for qualified cases

Our platform provides users with detailed documentation including:
• FMV analysis reports comparing offers to market rates
• Line-item breakdowns of potential underpayment
• Supporting market data and pricing sources

Would you be interested in receiving referrals from our platform?

Best regards,

[YOUR_NAME]
MaxClaim Partner Relations
[EMAIL]
[PHONE]`,
    placeholders: ["ATTORNEY_NAME", "YOUR_NAME", "EMAIL", "PHONE"],
    isActive: 1
  }
];

export async function seedProOrganizations(): Promise<void> {
  console.log("[Seed] Checking pro organizations...");
  
  const existing = await storage.getProOrganizations({});
  if (existing.length > 0) {
    console.log(`[Seed] Pro organizations already seeded (${existing.length} found)`);
    return;
  }
  
  console.log("[Seed] Seeding pro organizations...");
  for (const org of proOrganizationsData) {
    try {
      await storage.createProOrganization(org);
    } catch (error) {
      console.error(`[Seed] Failed to create org ${org.name}:`, error);
    }
  }
  console.log(`[Seed] Seeded ${proOrganizationsData.length} pro organizations`);
}

export async function seedEmailTemplates(): Promise<void> {
  console.log("[Seed] Checking email templates...");
  
  const existing = await storage.getEmailTemplates({});
  if (existing.length > 0) {
    console.log(`[Seed] Email templates already seeded (${existing.length} found)`);
    return;
  }
  
  console.log("[Seed] Seeding email templates...");
  for (const template of emailTemplatesData) {
    try {
      await storage.createEmailTemplate(template as any);
    } catch (error) {
      console.error(`[Seed] Failed to create template ${template.name}:`, error);
    }
  }
  console.log(`[Seed] Seeded ${emailTemplatesData.length} email templates`);
}

export async function seedProOrgsAndTemplates(): Promise<void> {
  await seedProOrganizations();
  await seedEmailTemplates();
}
