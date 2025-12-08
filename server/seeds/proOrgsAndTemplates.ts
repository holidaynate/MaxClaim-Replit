import { storage } from "../storage";

// Pro Organizations data from the MaxClaim Pro Orgs Database
// Enhanced with: directoryUrl, chapterMapUrl, chapterInfoUrl, parentId, regions, states
const proOrganizationsData = [
  // =====================
  // GENERAL CONTRACTORS
  // =====================
  {
    name: "Associated General Contractors of America (AGC)",
    category: "general_contractors" as const,
    scope: "national" as const,
    website: "https://www.agc.org",
    chapterMapUrl: "https://www.agc.org/connect/chapters",
    memberDirectoryUrl: "https://www.agc.org/member-directory",
    notes: "National association with state/local chapters"
  },
  {
    name: "Metal Building Contractors & Erectors Association (MBCEA)",
    category: "general_contractors" as const,
    scope: "national" as const,
    website: "https://www.mbcea.org",
    directoryUrl: "https://www.mbcea.org/member-directory",
    memberDirectoryUrl: "https://www.mbcea.org/member-directory",
    notes: "Metal building contractors - searchable member directory"
  },
  {
    name: "General Building Contractors Association (GBCA)",
    category: "general_contractors" as const,
    scope: "regional" as const,
    website: "https://gbca.com",
    memberDirectoryUrl: "https://members.gbca.com/directory",
    regions: ["PA", "NJ", "DE"],
    notes: "Regional - Philadelphia + Mid-Atlantic"
  },
  // AGC State Chapters (TX)
  {
    name: "AGC of Texas / Austin AGC",
    category: "general_contractors" as const,
    scope: "local" as const,
    state: "TX",
    city: "Austin",
    website: "https://www.agcaustin.org",
    directoryUrl: "https://members.agcaustin.org/list",
    parentId: "agc",
    notes: "Austin chapter of AGC"
  },

  // =====================
  // REMODELERS
  // =====================
  {
    name: "National Association of the Remodeling Industry (NARI)",
    category: "remodelers" as const,
    scope: "national" as const,
    website: "https://www.nari.org",
    chapterInfoUrl: "https://www.nari.org/remodelers/Benefits-for-Members/Chapter-Membership",
    memberDirectoryUrl: "https://www.nari.org/remodelers/Benefits-for-Members/Chapter-Membership",
    notes: "National association - chapters by state"
  },
  {
    name: "NARI Dallas",
    category: "remodelers" as const,
    scope: "local" as const,
    state: "TX",
    city: "Dallas",
    website: "https://www.naridallas.org",
    parentId: "nari"
  },
  {
    name: "NARI Houston",
    category: "remodelers" as const,
    scope: "local" as const,
    state: "TX",
    city: "Houston",
    website: "https://www.houstonnari.org",
    parentId: "nari"
  },

  // =====================
  // ROOFERS
  // =====================
  {
    name: "National Roofing Contractors Association (NRCA)",
    category: "roofers" as const,
    scope: "national" as const,
    website: "https://www.nrca.net",
    directoryUrl: "https://www.nrca.net/roofing-contractors",
    memberDirectoryUrl: "https://www.nrca.net/roofing-contractors",
    notes: "National roofing - contractor finder tool"
  },
  {
    name: "Western States Roofing Contractors Association (WSRCA)",
    category: "roofers" as const,
    scope: "regional" as const,
    website: "https://www.wsrca.com",
    regions: ["AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "OR", "TX", "UT", "WA", "WY"],
    notes: "Western US - includes TX, CA, AZ, NM, CO, HI, ID, MT, NV, OR, UT, WA, WY"
  },
  {
    name: "Midwest Roofing Contractors Association (MRCA)",
    category: "roofers" as const,
    scope: "regional" as const,
    website: "https://www.mrca.org",
    regions: ["IA", "IL", "IN", "KS", "KY", "MI", "MN", "MO", "NE", "ND", "SD", "WI"],
    notes: "Midwest region - 12 states"
  },
  {
    name: "North East Roofing Contractors Association (NERCA)",
    category: "roofers" as const,
    scope: "regional" as const,
    website: "https://www.nerca.org",
    regions: ["CT", "MA", "ME", "NH", "NJ", "NY", "PA", "RI", "VT"],
    notes: "Northeast region - 9 states"
  },
  {
    name: "Florida Roofing & Sheet Metal Contractors Association (FRSA)",
    category: "roofers" as const,
    scope: "state" as const,
    state: "FL",
    states: ["FL"],
    website: "https://www.floridaroof.com",
    notes: "Florida state association"
  },

  // =====================
  // PUBLIC ADJUSTERS
  // =====================
  {
    name: "National Association of Public Insurance Adjusters (NAPIA)",
    category: "public_adjusters" as const,
    scope: "national" as const,
    website: "https://www.napia.com",
    directoryUrl: "https://www.napia.com/find-an-adjuster",
    memberDirectoryUrl: "https://www.napia.com/find-an-adjuster",
    notes: "National association - Find an Adjuster tool filters by state"
  },
  {
    name: "Texas Department of Insurance (TDI) - License Lookup",
    category: "regulator" as const,
    scope: "state" as const,
    state: "TX",
    states: ["TX"],
    website: "https://www.tdi.texas.gov",
    directoryUrl: "https://txapps.texas.gov/NASApp/tdi/TdiARManager",
    notes: "Texas adjuster license search and verification"
  },
  {
    name: "Florida Division of Insurance Agent & Agency Services",
    category: "regulator" as const,
    scope: "state" as const,
    state: "FL",
    states: ["FL"],
    website: "https://www.myfloridacfo.com/division/agents",
    directoryUrl: "https://licenseesearch.fldfs.com/",
    notes: "Florida adjuster license lookup"
  },

  // =====================
  // REGULATORS (National)
  // =====================
  {
    name: "NAIC - State Insurance Departments Hub",
    category: "regulator" as const,
    scope: "national" as const,
    website: "https://content.naic.org/state-insurance-departments",
    directoryUrl: "https://content.naic.org/state-insurance-departments",
    notes: "Links to all 50 state insurance department websites"
  },

  // =====================
  // ATTORNEYS
  // =====================
  {
    name: "State Bar of Texas - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "TX",
    states: ["TX"],
    website: "https://www.texasbar.com",
    directoryUrl: "https://www.texasbar.com/AM/Template.cfm?Section=Find_A_Lawyer",
    memberDirectoryUrl: "https://www.texasbar.com/AM/Template.cfm?Section=Find_A_Lawyer",
    notes: "Texas state bar - attorney search for insurance law"
  },
  {
    name: "Austin Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "local" as const,
    state: "TX",
    city: "Austin",
    website: "https://www.austinbar.org",
    directoryUrl: "https://www.austinbar.org/?pg=FindALawyer",
    notes: "Local Austin bar directory"
  },
  {
    name: "State Bar of California - Attorney Search",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "CA",
    states: ["CA"],
    website: "https://www.calbar.ca.gov",
    directoryUrl: "https://www.calbar.ca.gov/Attorneys/Find-an-Attorney",
    memberDirectoryUrl: "https://www.calbar.ca.gov/Attorneys/Find-an-Attorney",
    notes: "California state bar association"
  },
  {
    name: "Florida Bar - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "FL",
    states: ["FL"],
    website: "https://www.floridabar.org",
    directoryUrl: "https://www.floridabar.org/directories/find-mbr/",
    memberDirectoryUrl: "https://www.floridabar.org/directories/find-mbr/",
    notes: "Florida state bar association"
  },

  // =====================
  // DISASTER RECOVERY
  // =====================
  {
    name: "Federal Emergency Management Agency (FEMA)",
    category: "disaster" as const,
    scope: "national" as const,
    website: "https://www.fema.gov",
    directoryUrl: "https://www.fema.gov/disaster/current",
    notes: "Federal disaster declarations and recovery resources"
  },
  {
    name: "U.S. Economic Development Administration - Disaster Recovery",
    category: "disaster" as const,
    scope: "national" as const,
    website: "https://www.eda.gov/strategic-initiatives/disaster-recovery",
    notes: "Federal economic disaster recovery programs"
  },
  {
    name: "American Red Cross - Disaster Relief",
    category: "disaster" as const,
    scope: "national" as const,
    website: "https://www.redcross.org/get-help/disaster-relief-and-recovery-services.html",
    directoryUrl: "https://www.redcross.org/find-your-local-chapter.html",
    notes: "Emergency shelter, food, and recovery assistance"
  },
  {
    name: "SBA Disaster Loan Assistance",
    category: "disaster" as const,
    scope: "national" as const,
    website: "https://www.sba.gov/funding-programs/disaster-assistance",
    notes: "Low-interest disaster loans for homeowners and businesses"
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
  
  // Clear existing and reseed with updated data
  const existing = await storage.getProOrganizations({});
  
  // Only reseed if count doesn't match (data structure updated)
  if (existing.length === proOrganizationsData.length) {
    console.log(`[Seed] Pro organizations already seeded (${existing.length} found)`);
    return;
  }
  
  // Clear existing for fresh seed with new schema
  if (existing.length > 0) {
    console.log("[Seed] Clearing old pro organizations for schema update...");
    for (const org of existing) {
      await storage.deleteProOrganization(org.id);
    }
  }
  
  console.log("[Seed] Seeding pro organizations with enhanced data...");
  for (const org of proOrganizationsData) {
    try {
      await storage.createProOrganization(org as any);
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
