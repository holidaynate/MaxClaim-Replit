import { storage } from "../storage";

// Pro Organizations data from the MaxClaim Pro Orgs Database
// Enhanced with: directoryUrl, chapterMapUrl, chapterInfoUrl, parentId, regions, states, priority, primaryHazards
// Priority: 1 = Critical (always target), 2 = High-disaster states, 3 = Standard/specialty
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
    priority: 1,
    notes: "National association with state/local chapters"
  },
  {
    name: "Metal Building Contractors & Erectors Association (MBCEA)",
    category: "general_contractors" as const,
    scope: "national" as const,
    website: "https://www.mbcea.org",
    directoryUrl: "https://www.mbcea.org/member-directory",
    memberDirectoryUrl: "https://www.mbcea.org/member-directory",
    priority: 2,
    notes: "Metal building contractors - searchable member directory"
  },
  {
    name: "General Building Contractors Association (GBCA)",
    category: "general_contractors" as const,
    scope: "regional" as const,
    website: "https://gbca.com",
    memberDirectoryUrl: "https://members.gbca.com/directory",
    regions: ["PA", "NJ", "DE"],
    priority: 3,
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
    priority: 1,
    primaryHazards: ["tornado", "hail", "hurricane"],
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
    priority: 1,
    notes: "National association - chapters by state"
  },
  {
    name: "NARI Dallas",
    category: "remodelers" as const,
    scope: "local" as const,
    state: "TX",
    city: "Dallas",
    website: "https://www.naridallas.org",
    parentId: "nari",
    priority: 1,
    primaryHazards: ["tornado", "hail"]
  },
  {
    name: "NARI Houston",
    category: "remodelers" as const,
    scope: "local" as const,
    state: "TX",
    city: "Houston",
    website: "https://www.houstonnari.org",
    parentId: "nari",
    priority: 1,
    primaryHazards: ["hurricane", "flood"]
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
    priority: 1,
    notes: "National roofing - contractor finder tool"
  },
  {
    name: "Western States Roofing Contractors Association (WSRCA)",
    category: "roofers" as const,
    scope: "regional" as const,
    website: "https://www.wsrca.com",
    regions: ["AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "OR", "TX", "UT", "WA", "WY"],
    priority: 1,
    primaryHazards: ["wildfire", "earthquake", "tornado"],
    notes: "Western US - includes TX, CA, AZ, NM, CO, HI, ID, MT, NV, OR, UT, WA, WY"
  },
  {
    name: "Midwest Roofing Contractors Association (MRCA)",
    category: "roofers" as const,
    scope: "regional" as const,
    website: "https://www.mrca.org",
    regions: ["IA", "IL", "IN", "KS", "KY", "MI", "MN", "MO", "NE", "ND", "SD", "WI"],
    priority: 1,
    primaryHazards: ["tornado", "hail", "flood"],
    notes: "Midwest region - 12 states"
  },
  {
    name: "North East Roofing Contractors Association (NERCA)",
    category: "roofers" as const,
    scope: "regional" as const,
    website: "https://www.nerca.org",
    regions: ["CT", "MA", "ME", "NH", "NJ", "NY", "PA", "RI", "VT"],
    priority: 2,
    primaryHazards: ["hurricane", "flood"],
    notes: "Northeast region - 9 states"
  },
  {
    name: "Florida Roofing & Sheet Metal Contractors Association (FRSA)",
    category: "roofers" as const,
    scope: "state" as const,
    state: "FL",
    states: ["FL"],
    website: "https://www.floridaroof.com",
    priority: 1,
    primaryHazards: ["hurricane", "flood"],
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
    priority: 1,
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
    priority: 1,
    primaryHazards: ["tornado", "hurricane", "hail", "flood"],
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
    priority: 1,
    primaryHazards: ["hurricane", "flood"],
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
    priority: 1,
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
    priority: 1,
    primaryHazards: ["tornado", "hurricane", "hail"],
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
    priority: 2,
    primaryHazards: ["tornado", "hail"],
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
    priority: 1,
    primaryHazards: ["wildfire", "earthquake"],
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
    priority: 1,
    primaryHazards: ["hurricane", "flood"],
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
    priority: 1,
    notes: "Federal disaster declarations and recovery resources"
  },
  {
    name: "U.S. Economic Development Administration - Disaster Recovery",
    category: "disaster" as const,
    scope: "national" as const,
    website: "https://www.eda.gov/strategic-initiatives/disaster-recovery",
    priority: 2,
    notes: "Federal economic disaster recovery programs"
  },
  {
    name: "American Red Cross - Disaster Relief",
    category: "disaster" as const,
    scope: "national" as const,
    website: "https://www.redcross.org/get-help/disaster-relief-and-recovery-services.html",
    directoryUrl: "https://www.redcross.org/find-your-local-chapter.html",
    priority: 1,
    notes: "Emergency shelter, food, and recovery assistance"
  },
  {
    name: "SBA Disaster Loan Assistance",
    category: "disaster" as const,
    scope: "national" as const,
    website: "https://www.sba.gov/funding-programs/disaster-assistance",
    priority: 1,
    notes: "Low-interest disaster loans for homeowners and businesses"
  },

  // =====================
  // STATE LICENSING BOARDS (Critical + High Risk States)
  // =====================
  {
    name: "Texas Department of Licensing & Regulation (TDLR)",
    category: "licensing" as const,
    scope: "state" as const,
    state: "TX",
    states: ["TX"],
    website: "https://www.tdlr.texas.gov",
    directoryUrl: "https://www.tdlr.texas.gov/LicenseSearch/",
    priority: 1,
    primaryHazards: ["severe_storm", "hurricane", "flood", "hail", "tornado"],
    notes: "Texas contractor license search by type - Critical disaster state"
  },
  {
    name: "Florida Dept of Business & Professional Regulation (DBPR)",
    category: "licensing" as const,
    scope: "state" as const,
    state: "FL",
    states: ["FL"],
    website: "https://www.myfloridalicense.com",
    directoryUrl: "https://www.myfloridalicense.com/wl11.asp",
    priority: 1,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "Florida licensed contractor search - Critical disaster state"
  },
  {
    name: "California Contractors State License Board (CSLB)",
    category: "licensing" as const,
    scope: "state" as const,
    state: "CA",
    states: ["CA"],
    website: "https://www.cslb.ca.gov",
    directoryUrl: "https://www.cslb.ca.gov/OnlineServices/CheckLicenseII/CheckLicense.aspx",
    priority: 1,
    primaryHazards: ["wildfire", "flood", "earthquake", "severe_storm"],
    notes: "California license lookup by contractor type - Critical disaster state"
  },
  {
    name: "Oklahoma Construction Industries Board",
    category: "licensing" as const,
    scope: "state" as const,
    state: "OK",
    states: ["OK"],
    website: "https://ocieb.ok.gov",
    directoryUrl: "https://ocieb.ok.gov/verify-license",
    priority: 1,
    primaryHazards: ["tornado", "severe_storm", "hail", "flood"],
    notes: "Oklahoma contractor license verification - Critical disaster state"
  },
  {
    name: "Illinois Division of Professional Regulation",
    category: "licensing" as const,
    scope: "state" as const,
    state: "IL",
    states: ["IL"],
    website: "https://www.idfpr.com",
    directoryUrl: "https://online-dfpr.micropact.com/lookup/licenselookup.aspx",
    priority: 1,
    primaryHazards: ["severe_storm", "tornado", "flood"],
    notes: "Illinois license lookup - Critical disaster state"
  },
  {
    name: "Georgia Secretary of State - Contractor Licensing",
    category: "licensing" as const,
    scope: "state" as const,
    state: "GA",
    states: ["GA"],
    website: "https://sos.ga.gov",
    directoryUrl: "https://verify.sos.ga.gov/verification/",
    priority: 2,
    primaryHazards: ["severe_storm", "tornado", "hurricane"],
    notes: "Georgia contractor verification - High disaster state"
  },
  {
    name: "North Carolina Licensing Board for General Contractors",
    category: "licensing" as const,
    scope: "state" as const,
    state: "NC",
    states: ["NC"],
    website: "https://www.nclbgc.org",
    directoryUrl: "https://www.nclbgc.org/LicenseeList",
    priority: 2,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "North Carolina GC licensing - High disaster state"
  },

  // =====================
  // ADDITIONAL STATE INSURANCE COMMISSIONERS
  // =====================
  {
    name: "California Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "CA",
    states: ["CA"],
    website: "https://www.insurance.ca.gov",
    directoryUrl: "https://interactive.web.insurance.ca.gov/webuser/licw_name_search$.startup",
    priority: 1,
    notes: "California adjuster/agent license lookup"
  },
  {
    name: "Oklahoma Insurance Department",
    category: "regulator" as const,
    scope: "state" as const,
    state: "OK",
    states: ["OK"],
    website: "https://www.oid.ok.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 1,
    notes: "Oklahoma insurance license search"
  },
  {
    name: "Mississippi Insurance Department",
    category: "regulator" as const,
    scope: "state" as const,
    state: "MS",
    states: ["MS"],
    website: "https://www.mid.ms.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 1,
    notes: "Mississippi adjuster license lookup"
  },
  {
    name: "Illinois Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "IL",
    states: ["IL"],
    website: "https://insurance.illinois.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 1,
    notes: "Illinois insurance license search"
  },
  {
    name: "Georgia Office of Commissioner of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "GA",
    states: ["GA"],
    website: "https://oci.georgia.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 2,
    notes: "Georgia insurance license lookup"
  },
  {
    name: "Missouri Department of Commerce & Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "MO",
    states: ["MO"],
    website: "https://insurance.mo.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 2,
    primaryHazards: ["severe_storm", "tornado", "flood"],
    notes: "Missouri insurance license search - High disaster state"
  },

  // =====================
  // ADDITIONAL STATE BAR ASSOCIATIONS
  // =====================
  {
    name: "Oklahoma Bar Association - Lawyer Referral",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "OK",
    states: ["OK"],
    website: "https://www.okbar.org",
    directoryUrl: "https://www.okbar.org/lrs/",
    priority: 1,
    notes: "Oklahoma lawyer referral service"
  },
  {
    name: "Mississippi Bar Association",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "MS",
    states: ["MS"],
    website: "https://www.msbar.org",
    directoryUrl: "https://www.msbar.org/lawyer-directory/",
    priority: 1,
    notes: "Mississippi lawyer directory"
  },
  {
    name: "Illinois State Bar Association",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "IL",
    states: ["IL"],
    website: "https://www.isba.org",
    directoryUrl: "https://www.isba.org/public/findlawyer",
    priority: 1,
    notes: "Illinois lawyer referral service"
  },
  {
    name: "Missouri Bar - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "MO",
    states: ["MO"],
    website: "https://www.mobar.org",
    directoryUrl: "https://www.mobar.org/public/lawyersearch.aspx",
    priority: 2,
    notes: "Missouri attorney search - High disaster state"
  },
  {
    name: "Georgia State Bar - Lawyer Search",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "GA",
    states: ["GA"],
    website: "https://www.gabar.org",
    directoryUrl: "https://www.gabar.org/forthepublic/findalawyer/",
    priority: 2,
    notes: "Georgia lawyer finder"
  },
  {
    name: "North Carolina State Bar",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "NC",
    states: ["NC"],
    website: "https://www.ncbar.gov",
    directoryUrl: "https://www.nclawspecialists.gov/",
    priority: 2,
    notes: "North Carolina attorney search"
  },
  {
    name: "Alabama State Bar - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "AL",
    states: ["AL"],
    website: "https://www.alabar.org",
    directoryUrl: "https://www.alabar.org/find-a-lawyer/",
    priority: 2,
    primaryHazards: ["severe_storm", "tornado", "hurricane"],
    notes: "Alabama lawyer referral - High disaster state"
  },
  {
    name: "Colorado Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "CO",
    states: ["CO"],
    website: "https://www.cobar.org",
    directoryUrl: "https://www.cobar.org/Find-A-Lawyer",
    priority: 2,
    primaryHazards: ["severe_storm", "wildfire", "hail"],
    notes: "Colorado attorney search - High disaster state"
  },

  // =====================
  // FEMA REGIONAL OFFICES
  // =====================
  {
    name: "FEMA Region 4 (Southeast)",
    category: "disaster" as const,
    scope: "regional" as const,
    website: "https://www.fema.gov/about/organization/region-4",
    directoryUrl: "https://www.fema.gov/disaster/declarations",
    regions: ["AL", "FL", "GA", "KY", "MS", "NC", "SC", "TN"],
    priority: 1,
    primaryHazards: ["hurricane", "tornado", "flood", "severe_storm"],
    notes: "Southeast region - hurricane and flood focus"
  },
  {
    name: "FEMA Region 5 (Midwest)",
    category: "disaster" as const,
    scope: "regional" as const,
    website: "https://www.fema.gov/about/organization/region-5",
    directoryUrl: "https://www.fema.gov/disaster/declarations",
    regions: ["IL", "IN", "MI", "MN", "OH", "WI"],
    priority: 1,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Great Lakes region - severe storm focus"
  },
  {
    name: "FEMA Region 6 (Southwest)",
    category: "disaster" as const,
    scope: "regional" as const,
    website: "https://www.fema.gov/about/organization/region-6",
    directoryUrl: "https://www.fema.gov/disaster/declarations",
    regions: ["AR", "LA", "NM", "OK", "TX"],
    priority: 1,
    primaryHazards: ["hurricane", "tornado", "flood", "hail"],
    notes: "Southwest region - hurricane and tornado alley"
  },
  {
    name: "FEMA Region 7 (Midwest South)",
    category: "disaster" as const,
    scope: "regional" as const,
    website: "https://www.fema.gov/about/organization/region-7",
    directoryUrl: "https://www.fema.gov/disaster/declarations",
    regions: ["IA", "KS", "MO", "NE"],
    priority: 1,
    primaryHazards: ["tornado", "severe_storm", "flood", "hail"],
    notes: "Plains region - tornado alley coverage"
  },
  {
    name: "FEMA Region 9 (West)",
    category: "disaster" as const,
    scope: "regional" as const,
    website: "https://www.fema.gov/about/organization/region-9",
    directoryUrl: "https://www.fema.gov/disaster/declarations",
    regions: ["AZ", "CA", "HI", "NV"],
    priority: 1,
    primaryHazards: ["wildfire", "earthquake", "flood"],
    notes: "Pacific region - wildfire and seismic"
  },
  {
    name: "FEMA Region 10 (Northwest)",
    category: "disaster" as const,
    scope: "regional" as const,
    website: "https://www.fema.gov/about/organization/region-10",
    directoryUrl: "https://www.fema.gov/disaster/declarations",
    regions: ["AK", "ID", "OR", "WA"],
    priority: 2,
    primaryHazards: ["wildfire", "earthquake", "flood"],
    notes: "Pacific Northwest - wildfire and seismic"
  },

  // =====================
  // TIER 2 HIGH-RISK STATES - REGULATORS
  // =====================
  {
    name: "Kansas Insurance Department",
    category: "regulator" as const,
    scope: "state" as const,
    state: "KS",
    states: ["KS"],
    website: "https://insurance.kansas.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 2,
    primaryHazards: ["tornado", "hail", "severe_storm"],
    notes: "Kansas insurance license search - Tornado alley"
  },
  {
    name: "Tennessee Department of Commerce & Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "TN",
    states: ["TN"],
    website: "https://www.tn.gov/commerce/insurance.html",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 2,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Tennessee insurance regulator"
  },
  {
    name: "South Carolina Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "SC",
    states: ["SC"],
    website: "https://doi.sc.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 2,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "South Carolina insurance regulator - Coastal state"
  },
  {
    name: "Virginia Bureau of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "VA",
    states: ["VA"],
    website: "https://www.scc.virginia.gov/pages/Bureau-of-Insurance",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 2,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "Virginia insurance regulator"
  },
  {
    name: "Arkansas Insurance Department",
    category: "regulator" as const,
    scope: "state" as const,
    state: "AR",
    states: ["AR"],
    website: "https://insurance.arkansas.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 2,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Arkansas insurance regulator - Tornado corridor"
  },
  {
    name: "Kentucky Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "KY",
    states: ["KY"],
    website: "https://insurance.ky.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 2,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Kentucky insurance regulator"
  },
  {
    name: "Louisiana Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "LA",
    states: ["LA"],
    website: "https://www.ldi.la.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 1,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "Louisiana insurance regulator - Critical hurricane state"
  },
  {
    name: "New York Department of Financial Services",
    category: "regulator" as const,
    scope: "state" as const,
    state: "NY",
    states: ["NY"],
    website: "https://www.dfs.ny.gov",
    directoryUrl: "https://myportal.dfs.ny.gov/web/guest/license-search",
    priority: 2,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "New York insurance regulator"
  },
  {
    name: "Pennsylvania Insurance Department",
    category: "regulator" as const,
    scope: "state" as const,
    state: "PA",
    states: ["PA"],
    website: "https://www.insurance.pa.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 2,
    primaryHazards: ["severe_storm", "flood"],
    notes: "Pennsylvania insurance regulator"
  },
  {
    name: "Washington Office of Insurance Commissioner",
    category: "regulator" as const,
    scope: "state" as const,
    state: "WA",
    states: ["WA"],
    website: "https://www.insurance.wa.gov",
    directoryUrl: "https://www.insurance.wa.gov/verify-financial-professional",
    priority: 2,
    primaryHazards: ["wildfire", "earthquake", "flood"],
    notes: "Washington state insurance regulator"
  },

  // =====================
  // TIER 2 HIGH-RISK STATES - LICENSING BOARDS
  // =====================
  {
    name: "Kansas Department of Labor - Roofing Registration",
    category: "licensing" as const,
    scope: "state" as const,
    state: "KS",
    states: ["KS"],
    website: "https://www.dol.ks.gov",
    directoryUrl: "https://www.dol.ks.gov/roofing",
    priority: 2,
    primaryHazards: ["tornado", "hail", "severe_storm"],
    notes: "Kansas roofing contractor registration - Hail corridor"
  },
  {
    name: "Tennessee Board for Licensing Contractors",
    category: "licensing" as const,
    scope: "state" as const,
    state: "TN",
    states: ["TN"],
    website: "https://www.tn.gov/commerce/regboards/contractors.html",
    directoryUrl: "https://verify.llr.sc.gov/LicenseSearch/",
    priority: 2,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Tennessee contractor licensing"
  },
  {
    name: "South Carolina Contractors Licensing Board",
    category: "licensing" as const,
    scope: "state" as const,
    state: "SC",
    states: ["SC"],
    website: "https://llr.sc.gov/clb/",
    directoryUrl: "https://verify.llr.sc.gov/LicenseSearch/",
    priority: 2,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "South Carolina contractor licensing - Coastal state"
  },
  {
    name: "Virginia Dept of Professional & Occupational Regulation",
    category: "licensing" as const,
    scope: "state" as const,
    state: "VA",
    states: ["VA"],
    website: "https://www.dpor.virginia.gov",
    directoryUrl: "https://www.dpor.virginia.gov/LicenseLookup",
    priority: 2,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "Virginia contractor licensing"
  },
  {
    name: "Arkansas Contractors Licensing Board",
    category: "licensing" as const,
    scope: "state" as const,
    state: "AR",
    states: ["AR"],
    website: "https://www.aclb.arkansas.gov",
    directoryUrl: "https://www.aclb.arkansas.gov/license-lookup",
    priority: 2,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Arkansas contractor licensing - Tornado corridor"
  },
  {
    name: "Louisiana State Licensing Board for Contractors",
    category: "licensing" as const,
    scope: "state" as const,
    state: "LA",
    states: ["LA"],
    website: "https://www.lslbc.louisiana.gov",
    directoryUrl: "https://www.lslbc.louisiana.gov/contractor-search/",
    priority: 1,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "Louisiana contractor licensing - Critical hurricane state"
  },
  {
    name: "New York Department of State - Contractor Registration",
    category: "licensing" as const,
    scope: "state" as const,
    state: "NY",
    states: ["NY"],
    website: "https://www.dos.ny.gov",
    directoryUrl: "https://appext20.dos.ny.gov/lcns_public/chk_load",
    priority: 2,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "New York contractor licensing"
  },
  {
    name: "Pennsylvania Attorney General - Home Improvement",
    category: "licensing" as const,
    scope: "state" as const,
    state: "PA",
    states: ["PA"],
    website: "https://www.attorneygeneral.gov",
    directoryUrl: "https://www.attorneygeneral.gov/protect-yourself/home-improvement/",
    priority: 2,
    primaryHazards: ["severe_storm", "flood"],
    notes: "Pennsylvania home improvement contractor info"
  },
  {
    name: "Washington State Dept of Labor & Industries",
    category: "licensing" as const,
    scope: "state" as const,
    state: "WA",
    states: ["WA"],
    website: "https://lni.wa.gov",
    directoryUrl: "https://secure.lni.wa.gov/verify/",
    priority: 2,
    primaryHazards: ["wildfire", "earthquake", "flood"],
    notes: "Washington contractor verification"
  },
  {
    name: "Alabama Licensing Board for General Contractors",
    category: "licensing" as const,
    scope: "state" as const,
    state: "AL",
    states: ["AL"],
    website: "https://genconbd.alabama.gov",
    directoryUrl: "https://genconbd.alabama.gov/LicenseeLookup",
    priority: 2,
    primaryHazards: ["tornado", "hurricane", "severe_storm"],
    notes: "Alabama contractor licensing - High tornado state"
  },
  {
    name: "Colorado Dept of Regulatory Agencies - Contractors",
    category: "licensing" as const,
    scope: "state" as const,
    state: "CO",
    states: ["CO"],
    website: "https://dora.colorado.gov",
    directoryUrl: "https://apps.colorado.gov/dora/licensing/Lookup/LicenseLookup.aspx",
    priority: 2,
    primaryHazards: ["wildfire", "hail", "severe_storm"],
    notes: "Colorado contractor licensing"
  },

  // =====================
  // TIER 2 HIGH-RISK STATES - ATTORNEYS
  // =====================
  {
    name: "Kansas Bar Association - Lawyer Finder",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "KS",
    states: ["KS"],
    website: "https://www.ksbar.org",
    directoryUrl: "https://www.ksbar.org/page/find_a_lawyer",
    priority: 2,
    primaryHazards: ["tornado", "hail", "severe_storm"],
    notes: "Kansas lawyer referral"
  },
  {
    name: "Tennessee Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "TN",
    states: ["TN"],
    website: "https://www.tba.org",
    directoryUrl: "https://www.tba.org/index.cfm?pg=FindALawyer",
    priority: 2,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Tennessee lawyer referral"
  },
  {
    name: "South Carolina Bar - Lawyer Referral",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "SC",
    states: ["SC"],
    website: "https://www.scbar.org",
    directoryUrl: "https://www.scbar.org/public/get-legal-help/find-lawyer-by-county/",
    priority: 2,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "South Carolina lawyer referral - Coastal state"
  },
  {
    name: "Virginia State Bar - Attorney Search",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "VA",
    states: ["VA"],
    website: "https://www.vsb.org",
    directoryUrl: "https://www.vsb.org/vlrs/",
    priority: 2,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "Virginia lawyer referral"
  },
  {
    name: "Arkansas Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "AR",
    states: ["AR"],
    website: "https://www.arkbar.com",
    directoryUrl: "https://www.arkbar.com/for-the-public/lawyer-search",
    priority: 2,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Arkansas lawyer referral"
  },
  {
    name: "Kentucky Bar Association - Lawyer Locator",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "KY",
    states: ["KY"],
    website: "https://www.kybar.org",
    directoryUrl: "https://www.kybar.org/search/custom.asp?id=lawyer_locator",
    priority: 2,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Kentucky lawyer referral"
  },
  {
    name: "Louisiana State Bar Association - Lawyer Referral",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "LA",
    states: ["LA"],
    website: "https://www.lsba.org",
    directoryUrl: "https://www.lsba.org/Public/FindLegalHelp.aspx",
    priority: 1,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "Louisiana lawyer referral - Critical hurricane state"
  },
  {
    name: "New York State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "NY",
    states: ["NY"],
    website: "https://www.nysba.org",
    directoryUrl: "https://www.nysba.org/lawyerreferral/",
    priority: 2,
    primaryHazards: ["hurricane", "flood", "severe_storm"],
    notes: "New York lawyer referral"
  },
  {
    name: "Pennsylvania Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "PA",
    states: ["PA"],
    website: "https://www.pabar.org",
    directoryUrl: "https://www.pabar.org/public/lfr/",
    priority: 2,
    primaryHazards: ["severe_storm", "flood"],
    notes: "Pennsylvania lawyer referral"
  },
  {
    name: "Washington State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "WA",
    states: ["WA"],
    website: "https://www.wsba.org",
    directoryUrl: "https://www.wsba.org/for-the-public/find-legal-help",
    priority: 2,
    primaryHazards: ["wildfire", "earthquake", "flood"],
    notes: "Washington lawyer referral"
  },

  // =====================
  // TIER 3 MODERATE-RISK STATES
  // =====================
  {
    name: "Arizona Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "AZ",
    states: ["AZ"],
    website: "https://insurance.az.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["wildfire", "flood"],
    notes: "Arizona insurance regulator - Fire-prone state"
  },
  {
    name: "Arizona Registrar of Contractors",
    category: "licensing" as const,
    scope: "state" as const,
    state: "AZ",
    states: ["AZ"],
    website: "https://roc.az.gov",
    directoryUrl: "https://roc.az.gov/contractor-search",
    priority: 3,
    primaryHazards: ["wildfire", "flood"],
    notes: "Arizona contractor licensing"
  },
  {
    name: "State Bar of Arizona - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "AZ",
    states: ["AZ"],
    website: "https://www.azbar.org",
    directoryUrl: "https://www.azbar.org/for-the-public/find-a-lawyer/",
    priority: 3,
    primaryHazards: ["wildfire", "flood"],
    notes: "Arizona lawyer referral"
  },
  {
    name: "Indiana Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "IN",
    states: ["IN"],
    website: "https://www.in.gov/idoi",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["tornado", "severe_storm"],
    notes: "Indiana insurance regulator"
  },
  {
    name: "Indiana State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "IN",
    states: ["IN"],
    website: "https://www.inbar.org",
    directoryUrl: "https://www.inbar.org/page/findlawyer",
    priority: 3,
    primaryHazards: ["tornado", "severe_storm"],
    notes: "Indiana lawyer referral"
  },
  {
    name: "Ohio Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "OH",
    states: ["OH"],
    website: "https://insurance.ohio.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Ohio insurance regulator"
  },
  {
    name: "Ohio State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "OH",
    states: ["OH"],
    website: "https://www.ohiobar.org",
    directoryUrl: "https://www.ohiobar.org/public-resources/",
    priority: 3,
    primaryHazards: ["tornado", "severe_storm", "flood"],
    notes: "Ohio lawyer referral"
  },
  {
    name: "Michigan Dept of Insurance & Financial Services",
    category: "regulator" as const,
    scope: "state" as const,
    state: "MI",
    states: ["MI"],
    website: "https://www.michigan.gov/difs",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["severe_storm", "flood"],
    notes: "Michigan insurance regulator"
  },
  {
    name: "State Bar of Michigan - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "MI",
    states: ["MI"],
    website: "https://www.michbar.org",
    directoryUrl: "https://www.michbar.org/programs/lawyerreferral",
    priority: 3,
    primaryHazards: ["severe_storm", "flood"],
    notes: "Michigan lawyer referral"
  },
  {
    name: "Minnesota Department of Commerce",
    category: "regulator" as const,
    scope: "state" as const,
    state: "MN",
    states: ["MN"],
    website: "https://mn.gov/commerce",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["severe_storm", "tornado", "flood"],
    notes: "Minnesota insurance regulator"
  },
  {
    name: "Minnesota State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "MN",
    states: ["MN"],
    website: "https://www.mnbar.org",
    directoryUrl: "https://www.mnbar.org/member-directory/find-a-lawyer",
    priority: 3,
    primaryHazards: ["severe_storm", "tornado", "flood"],
    notes: "Minnesota lawyer referral"
  },
  {
    name: "Wisconsin Office of the Commissioner of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "WI",
    states: ["WI"],
    website: "https://oci.wi.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["severe_storm", "tornado", "flood"],
    notes: "Wisconsin insurance regulator"
  },
  {
    name: "State Bar of Wisconsin - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "WI",
    states: ["WI"],
    website: "https://www.wisbar.org",
    directoryUrl: "https://www.wisbar.org/forpublic/pages/hire-a-lawyer.aspx",
    priority: 3,
    primaryHazards: ["severe_storm", "tornado", "flood"],
    notes: "Wisconsin lawyer referral"
  },
  {
    name: "Iowa Insurance Division",
    category: "regulator" as const,
    scope: "state" as const,
    state: "IA",
    states: ["IA"],
    website: "https://iid.iowa.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["tornado", "flood", "severe_storm"],
    notes: "Iowa insurance regulator"
  },
  {
    name: "Iowa State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "IA",
    states: ["IA"],
    website: "https://www.iowabar.org",
    directoryUrl: "https://www.iowabar.org/page/FindALawyer",
    priority: 3,
    primaryHazards: ["tornado", "flood", "severe_storm"],
    notes: "Iowa lawyer referral"
  },
  {
    name: "Nebraska Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "NE",
    states: ["NE"],
    website: "https://doi.nebraska.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["tornado", "hail", "severe_storm"],
    notes: "Nebraska insurance regulator"
  },
  {
    name: "Nebraska State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "NE",
    states: ["NE"],
    website: "https://www.nebar.com",
    directoryUrl: "https://www.nebar.com/page/findattorney",
    priority: 3,
    primaryHazards: ["tornado", "hail", "severe_storm"],
    notes: "Nebraska lawyer referral"
  },
  {
    name: "Oregon Division of Financial Regulation",
    category: "regulator" as const,
    scope: "state" as const,
    state: "OR",
    states: ["OR"],
    website: "https://dfr.oregon.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["wildfire", "earthquake", "flood"],
    notes: "Oregon insurance regulator - Wildfire state"
  },
  {
    name: "Oregon Construction Contractors Board",
    category: "licensing" as const,
    scope: "state" as const,
    state: "OR",
    states: ["OR"],
    website: "https://www.oregon.gov/ccb",
    directoryUrl: "https://www.oregon.gov/ccb/Pages/search.aspx",
    priority: 3,
    primaryHazards: ["wildfire", "earthquake", "flood"],
    notes: "Oregon contractor licensing"
  },
  {
    name: "Oregon State Bar - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "OR",
    states: ["OR"],
    website: "https://www.osbar.org",
    directoryUrl: "https://www.osbar.org/public/lrs.html",
    priority: 3,
    primaryHazards: ["wildfire", "earthquake", "flood"],
    notes: "Oregon lawyer referral"
  },
  {
    name: "Nevada Division of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "NV",
    states: ["NV"],
    website: "https://doi.nv.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["wildfire", "earthquake"],
    notes: "Nevada insurance regulator"
  },
  {
    name: "Nevada State Contractors Board",
    category: "licensing" as const,
    scope: "state" as const,
    state: "NV",
    states: ["NV"],
    website: "https://nscb.nv.gov",
    directoryUrl: "https://app.nscb.nv.gov/",
    priority: 3,
    primaryHazards: ["wildfire", "earthquake"],
    notes: "Nevada contractor licensing"
  },
  {
    name: "State Bar of Nevada - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "NV",
    states: ["NV"],
    website: "https://www.nvbar.org",
    directoryUrl: "https://www.nvbar.org/find-a-lawyer/",
    priority: 3,
    primaryHazards: ["wildfire", "earthquake"],
    notes: "Nevada lawyer referral"
  },
  {
    name: "New Mexico Office of Superintendent of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "NM",
    states: ["NM"],
    website: "https://www.osi.state.nm.us",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["wildfire", "flood"],
    notes: "New Mexico insurance regulator"
  },
  {
    name: "State Bar of New Mexico - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "NM",
    states: ["NM"],
    website: "https://www.sbnm.org",
    directoryUrl: "https://www.sbnm.org/For-Public/Find-an-Attorney",
    priority: 3,
    primaryHazards: ["wildfire", "flood"],
    notes: "New Mexico lawyer referral"
  },
  {
    name: "Utah Insurance Department",
    category: "regulator" as const,
    scope: "state" as const,
    state: "UT",
    states: ["UT"],
    website: "https://insurance.utah.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["wildfire", "earthquake"],
    notes: "Utah insurance regulator"
  },
  {
    name: "Utah State Bar - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "UT",
    states: ["UT"],
    website: "https://www.utahbar.org",
    directoryUrl: "https://www.utahbar.org/find-a-lawyer/",
    priority: 3,
    primaryHazards: ["wildfire", "earthquake"],
    notes: "Utah lawyer referral"
  },
  {
    name: "Idaho Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "ID",
    states: ["ID"],
    website: "https://doi.idaho.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["wildfire", "earthquake"],
    notes: "Idaho insurance regulator - Mountain fire risk"
  },
  {
    name: "Idaho State Bar - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "ID",
    states: ["ID"],
    website: "https://isb.idaho.gov",
    directoryUrl: "https://isb.idaho.gov/licensing-mcle/lawyer-licensing/",
    priority: 3,
    primaryHazards: ["wildfire", "earthquake"],
    notes: "Idaho lawyer referral"
  },
  {
    name: "Montana State Auditor - Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "MT",
    states: ["MT"],
    website: "https://csimt.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["wildfire", "flood"],
    notes: "Montana insurance regulator - Wildfire state"
  },
  {
    name: "State Bar of Montana - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "MT",
    states: ["MT"],
    website: "https://www.montanabar.org",
    directoryUrl: "https://www.montanabar.org/page/FindLawyer",
    priority: 3,
    primaryHazards: ["wildfire", "flood"],
    notes: "Montana lawyer referral"
  },
  {
    name: "Wyoming Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "WY",
    states: ["WY"],
    website: "https://insurance.wyo.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["wildfire", "severe_storm"],
    notes: "Wyoming insurance regulator"
  },
  {
    name: "Wyoming State Bar - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "WY",
    states: ["WY"],
    website: "https://www.wyomingbar.org",
    directoryUrl: "https://www.wyomingbar.org/for-the-public/hire-a-lawyer/",
    priority: 3,
    primaryHazards: ["wildfire", "severe_storm"],
    notes: "Wyoming lawyer referral"
  },
  {
    name: "Alaska Division of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "AK",
    states: ["AK"],
    website: "https://www.commerce.alaska.gov/web/ins/",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["earthquake", "flood"],
    notes: "Alaska insurance regulator - Seismic risk"
  },
  {
    name: "Alaska Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "AK",
    states: ["AK"],
    website: "https://www.alaskabar.org",
    directoryUrl: "https://www.alaskabar.org/for-the-public/finding-a-lawyer/",
    priority: 3,
    primaryHazards: ["earthquake", "flood"],
    notes: "Alaska lawyer referral"
  },
  {
    name: "Hawaii Insurance Division",
    category: "regulator" as const,
    scope: "state" as const,
    state: "HI",
    states: ["HI"],
    website: "https://cca.hawaii.gov/ins/",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["hurricane", "earthquake", "flood"],
    notes: "Hawaii insurance regulator - Island-specific risks"
  },
  {
    name: "Hawaii State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "HI",
    states: ["HI"],
    website: "https://hsba.org",
    directoryUrl: "https://hsba.org/HSBA/For_the_Public/Find_a_Lawyer/",
    priority: 3,
    primaryHazards: ["hurricane", "earthquake", "flood"],
    notes: "Hawaii lawyer referral"
  },
  {
    name: "North Dakota Insurance Department",
    category: "regulator" as const,
    scope: "state" as const,
    state: "ND",
    states: ["ND"],
    website: "https://www.insurance.nd.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["severe_storm", "flood"],
    notes: "North Dakota insurance regulator"
  },
  {
    name: "State Bar Association of North Dakota - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "ND",
    states: ["ND"],
    website: "https://www.sband.org",
    directoryUrl: "https://www.sband.org/page/attysearch",
    priority: 3,
    primaryHazards: ["severe_storm", "flood"],
    notes: "North Dakota lawyer referral"
  },
  {
    name: "South Dakota Division of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "SD",
    states: ["SD"],
    website: "https://dlr.sd.gov/insurance/",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 3,
    primaryHazards: ["severe_storm", "tornado", "hail"],
    notes: "South Dakota insurance regulator"
  },
  {
    name: "State Bar of South Dakota - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "SD",
    states: ["SD"],
    website: "https://www.statebarofsouthdakota.com",
    directoryUrl: "https://www.statebarofsouthdakota.com/page/FindALawyer",
    priority: 3,
    primaryHazards: ["severe_storm", "tornado", "hail"],
    notes: "South Dakota lawyer referral"
  },

  // =====================
  // TIER 4 LOW-RISK STATES
  // =====================
  {
    name: "Maine Bureau of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "ME",
    states: ["ME"],
    website: "https://www.maine.gov/pfr/insurance/",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["severe_storm", "flood"],
    notes: "Maine insurance regulator - Northeast"
  },
  {
    name: "Maine State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "ME",
    states: ["ME"],
    website: "https://www.mainebar.org",
    directoryUrl: "https://www.mainebar.org/page/lawyerreferralservice",
    priority: 4,
    primaryHazards: ["severe_storm", "flood"],
    notes: "Maine lawyer referral"
  },
  {
    name: "New Hampshire Insurance Department",
    category: "regulator" as const,
    scope: "state" as const,
    state: "NH",
    states: ["NH"],
    website: "https://www.nh.gov/insurance/",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["severe_storm", "flood"],
    notes: "New Hampshire insurance regulator"
  },
  {
    name: "New Hampshire Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "NH",
    states: ["NH"],
    website: "https://www.nhbar.org",
    directoryUrl: "https://www.nhbar.org/legal-services/lawyer-referral-service",
    priority: 4,
    primaryHazards: ["severe_storm", "flood"],
    notes: "New Hampshire lawyer referral"
  },
  {
    name: "Vermont Department of Financial Regulation",
    category: "regulator" as const,
    scope: "state" as const,
    state: "VT",
    states: ["VT"],
    website: "https://dfr.vermont.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["severe_storm", "flood"],
    notes: "Vermont insurance regulator"
  },
  {
    name: "Vermont Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "VT",
    states: ["VT"],
    website: "https://www.vtbar.org",
    directoryUrl: "https://www.vtbar.org/FOR-THE-PUBLIC/Find-a-Lawyer.aspx",
    priority: 4,
    primaryHazards: ["severe_storm", "flood"],
    notes: "Vermont lawyer referral"
  },
  {
    name: "Massachusetts Division of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "MA",
    states: ["MA"],
    website: "https://www.mass.gov/orgs/division-of-insurance",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "Massachusetts insurance regulator - Coastal state"
  },
  {
    name: "Massachusetts Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "MA",
    states: ["MA"],
    website: "https://www.massbar.org",
    directoryUrl: "https://www.massbar.org/public/lawyer-referral-service",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "Massachusetts lawyer referral"
  },
  {
    name: "Connecticut Insurance Department",
    category: "regulator" as const,
    scope: "state" as const,
    state: "CT",
    states: ["CT"],
    website: "https://portal.ct.gov/cid",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "Connecticut insurance regulator"
  },
  {
    name: "Connecticut Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "CT",
    states: ["CT"],
    website: "https://www.ctbar.org",
    directoryUrl: "https://www.ctbar.org/public/find-a-lawyer",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "Connecticut lawyer referral"
  },
  {
    name: "Rhode Island Department of Business Regulation",
    category: "regulator" as const,
    scope: "state" as const,
    state: "RI",
    states: ["RI"],
    website: "https://dbr.ri.gov/divisions/insurance/",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "Rhode Island insurance regulator"
  },
  {
    name: "Rhode Island Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "RI",
    states: ["RI"],
    website: "https://www.ribar.com",
    directoryUrl: "https://www.ribar.com/for-the-public/lawyer-referral-service/",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "Rhode Island lawyer referral"
  },
  {
    name: "New Jersey Department of Banking & Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "NJ",
    states: ["NJ"],
    website: "https://www.state.nj.us/dobi/",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "New Jersey insurance regulator - Coastal state"
  },
  {
    name: "New Jersey State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "NJ",
    states: ["NJ"],
    website: "https://www.njsba.com",
    directoryUrl: "https://www.njsba.com/for-the-public/find-a-lawyer/",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "New Jersey lawyer referral"
  },
  {
    name: "Delaware Department of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "DE",
    states: ["DE"],
    website: "https://insurance.delaware.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "Delaware insurance regulator"
  },
  {
    name: "Delaware State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "DE",
    states: ["DE"],
    website: "https://www.dsba.org",
    directoryUrl: "https://www.dsba.org/find-a-lawyer/",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "Delaware lawyer referral"
  },
  {
    name: "Maryland Insurance Administration",
    category: "regulator" as const,
    scope: "state" as const,
    state: "MD",
    states: ["MD"],
    website: "https://insurance.maryland.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "Maryland insurance regulator"
  },
  {
    name: "Maryland State Bar Association - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "MD",
    states: ["MD"],
    website: "https://www.msba.org",
    directoryUrl: "https://www.msba.org/for-the-public/lawyer-referral-service/",
    priority: 4,
    primaryHazards: ["hurricane", "severe_storm", "flood"],
    notes: "Maryland lawyer referral"
  },
  {
    name: "West Virginia Offices of the Insurance Commissioner",
    category: "regulator" as const,
    scope: "state" as const,
    state: "WV",
    states: ["WV"],
    website: "https://www.wvinsurance.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["severe_storm", "flood"],
    notes: "West Virginia insurance regulator"
  },
  {
    name: "West Virginia State Bar - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "WV",
    states: ["WV"],
    website: "https://www.wvbar.org",
    directoryUrl: "https://www.wvbar.org/lawyerreferralservice/",
    priority: 4,
    primaryHazards: ["severe_storm", "flood"],
    notes: "West Virginia lawyer referral"
  },
  {
    name: "District of Columbia Dept of Insurance",
    category: "regulator" as const,
    scope: "state" as const,
    state: "DC",
    states: ["DC"],
    website: "https://disb.dc.gov",
    directoryUrl: "https://sbs.naic.org/solar-external-lookup/",
    priority: 4,
    primaryHazards: ["severe_storm", "flood"],
    notes: "DC insurance regulator"
  },
  {
    name: "DC Bar - Find a Lawyer",
    category: "attorneys" as const,
    scope: "state" as const,
    state: "DC",
    states: ["DC"],
    website: "https://www.dcbar.org",
    directoryUrl: "https://www.dcbar.org/for-the-public/find-a-lawyer",
    priority: 4,
    primaryHazards: ["severe_storm", "flood"],
    notes: "DC lawyer referral"
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
  
  // Check existing data
  const existing = await storage.getProOrganizations({});
  
  // Check if existing data has v2 fields (priority AND primaryHazards populated)
  const hasV2Data = existing.length > 0 && existing.some(org => 
    org.priority !== null && 
    org.priority > 0 && 
    org.primaryHazards !== null && 
    org.primaryHazards.length > 0
  );
  
  // Reseed if count doesn't match or if v2 fields are missing
  if (existing.length === proOrganizationsData.length && hasV2Data) {
    console.log(`[Seed] Pro organizations already seeded with v2 data (${existing.length} found)`);
    return;
  }
  
  // Clear existing for fresh seed with new schema
  if (existing.length > 0) {
    console.log("[Seed] Clearing old pro organizations for v2 schema update...");
    for (const org of existing) {
      await storage.deleteProOrganization(org.id);
    }
  }
  
  console.log("[Seed] Seeding pro organizations with v2 data (priority + hazards)...");
  for (const org of proOrganizationsData) {
    try {
      await storage.createProOrganization(org as any);
    } catch (error) {
      console.error(`[Seed] Failed to create org ${org.name}:`, error);
    }
  }
  console.log(`[Seed] Seeded ${proOrganizationsData.length} pro organizations with disaster risk data`);
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
