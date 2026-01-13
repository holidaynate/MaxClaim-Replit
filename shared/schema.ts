import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, numeric, integer, timestamp, jsonb, pgEnum, char, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const sourceCategory = pgEnum("source_category", ["library", "api", "dataset"]);
export const claimStatus = pgEnum("claim_status", ["in_progress", "completed", "abandoned"]);
export const eventType = pgEnum("event_type", [
  "session_start",
  "page_view",
  "form_submit",
  "button_click",
  "file_upload",
  "calculation_complete",
  "export_pdf",
  "export_email"
]);
export const unitType = pgEnum("unit_type", ["LF", "SF", "SQ", "CT", "EA"]);
export const partnerType = pgEnum("partner_type", ["contractor", "adjuster", "agency"]);
export const partnerTier = pgEnum("partner_tier", ["advertiser", "affiliate", "partner"]);
export const partnerStatus = pgEnum("partner_status", ["pending", "approved", "rejected", "suspended"]);
export const leadType = pgEnum("lead_type", ["click", "referral", "conversion"]);
export const auditFlag = pgEnum("audit_flag", [
  "OK",
  "Below market minimum",
  "Above market maximum",
  "Significantly below average",
  "Significantly above average",
  "No data available"
]);
export const auditSeverity = pgEnum("audit_severity", ["success", "warning", "error", "info"]);

// Admin Users table (legacy - for admin dashboard)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Replit Auth Session storage table
// Reference: javascript_log_in_with_replit integration blueprint
export const authSessions = pgTable(
  "auth_sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_auth_session_expire").on(table.expire)],
);

// Replit Users table - for authenticated users via Replit Auth
// Reference: javascript_log_in_with_replit integration blueprint
export const replitUsers = pgTable("replit_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertReplitUser = typeof replitUsers.$inferInsert;
export type ReplitUser = typeof replitUsers.$inferSelect;

// Sessions - Anonymous tracking with ZIP code and settings
export const sessions = pgTable("sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  zipCode: char("zip_code", { length: 5 }),
  zipPrefix: char("zip_prefix", { length: 3 }),
  propertyAddress: text("property_address"),
  locale: varchar("locale", { length: 5 }).default("en"),
  textSize: varchar("text_size", { length: 20 }).default("normal"),
  highContrast: integer("high_contrast").default(0).$type<boolean>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  zipPrefixIdx: index("sessions_zip_prefix_idx").on(table.zipPrefix),
  createdAtIdx: index("sessions_created_at_idx").on(table.createdAt),
}));

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  lastActivityAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

// Session Events - Track user interactions with timestamps
export const sessionEvents = pgTable("session_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  eventType: eventType("event_type").notNull(),
  payload: jsonb("payload"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionEventIdx: index("session_events_session_idx").on(table.sessionId, table.occurredAt),
}));

export const insertSessionEventSchema = createInsertSchema(sessionEvents).omit({
  id: true,
  occurredAt: true,
});

export type InsertSessionEvent = z.infer<typeof insertSessionEventSchema>;
export type SessionEvent = typeof sessionEvents.$inferSelect;

// Claims - Group claim line items by session
export const claims = pgTable("claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  status: claimStatus("status").default("in_progress").notNull(),
  totalQuoted: numeric("total_quoted", { precision: 12, scale: 2 }).notNull().$type<number>(),
  totalFmv: numeric("total_fmv", { precision: 12, scale: 2 }).notNull().$type<number>(),
  additionalAmount: numeric("additional_amount", { precision: 12, scale: 2 }).notNull().$type<number>(),
  variancePct: numeric("variance_pct", { precision: 5, scale: 2 }).notNull().$type<number>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => ({
  sessionIdx: index("claims_session_idx").on(table.sessionId),
  statusCompletedIdx: index("claims_status_completed_idx").on(table.createdAt).where(sql`status = 'completed'`),
}));

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;

// Claim Line Items - Individual items in a claim with metadata
export const claimLineItems = pgTable("claim_line_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimId: varchar("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().$type<number>(),
  unit: unitType("unit").notNull().default("EA"),
  quotedPrice: numeric("quoted_price", { precision: 12, scale: 2 }).notNull().$type<number>(),
  fmvPrice: numeric("fmv_price", { precision: 12, scale: 2 }).notNull().$type<number>(),
  variancePct: numeric("variance_pct", { precision: 5, scale: 2 }).notNull().$type<number>(),
  fromOcr: integer("from_ocr").default(0),
}, (table) => ({
  claimIdx: index("claim_line_items_claim_idx").on(table.claimId),
}));

export const insertClaimLineItemSchema = createInsertSchema(claimLineItems).omit({
  id: true,
});

export type InsertClaimLineItem = z.infer<typeof insertClaimLineItemSchema>;
export type ClaimLineItem = typeof claimLineItems.$inferSelect;

// User Claims - Links claims to authenticated users for "My Claims" dashboard
export const userClaims = pgTable("user_claims", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => replitUsers.id, { onDelete: "cascade" }),
  claimId: varchar("claim_id").notNull().references(() => claims.id, { onDelete: "cascade" }),
  reportUrl: text("report_url"),
  inputs: jsonb("inputs").$type<{
    zipCode: string;
    propertyAddress?: string;
    items: Array<{
      category: string;
      description: string;
      quantity: number;
      unit: string;
      quotedPrice?: number;
      unitPrice?: number;
    }>;
    email?: string;
  }>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_claims_user_idx").on(table.userId),
  claimIdx: index("user_claims_claim_idx").on(table.claimId),
  createdAtIdx: index("user_claims_created_at_idx").on(table.createdAt),
}));

export const insertUserClaimSchema = createInsertSchema(userClaims).omit({
  id: true,
  createdAt: true,
});

// Define InsertUserClaim directly to avoid jsonb type inference issues
export type InsertUserClaim = {
  userId: string;
  claimId: string;
  reportUrl?: string | null;
  inputs?: {
    zipCode: string;
    propertyAddress?: string;
    items: Array<{
      category: string;
      description: string;
      quantity: number;
      unit: string;
      quotedPrice?: number;
      unitPrice?: number;
    }>;
    email?: string;
  } | null;
};
export type UserClaim = typeof userClaims.$inferSelect;

// Sources - Attribution for libraries, APIs, datasets
export const sources = pgTable("sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  category: sourceCategory("category").notNull(),
  url: text("url"),
  license: text("license"),
  requiredNotice: text("required_notice"),
  description: text("description"),
});

export const insertSourceSchema = createInsertSchema(sources).omit({
  id: true,
});

export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Source = typeof sources.$inferSelect;

// Source Versions - Track version history and retrieval dates
export const sourceVersions = pgTable("source_versions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceId: varchar("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).defaultNow().notNull(),
  notes: text("notes"),
}, (table) => ({
  sourceIdx: index("source_versions_source_idx").on(table.sourceId),
}));

export const insertSourceVersionSchema = createInsertSchema(sourceVersions).omit({
  id: true,
  retrievedAt: true,
});

export type InsertSourceVersion = z.infer<typeof insertSourceVersionSchema>;
export type SourceVersion = typeof sourceVersions.$inferSelect;

// Session Source Usage - Track which sources were used in each session
export const sessionSourceUsage = pgTable("session_source_usage", {
  sessionId: varchar("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  sourceId: varchar("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  purpose: text("purpose"),
  firstUsedAt: timestamp("first_used_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: index("session_source_usage_pk").on(table.sessionId, table.sourceId),
}));

export const insertSessionSourceUsageSchema = createInsertSchema(sessionSourceUsage).omit({
  firstUsedAt: true,
});

export type InsertSessionSourceUsage = z.infer<typeof insertSessionSourceUsageSchema>;
export type SessionSourceUsage = typeof sessionSourceUsage.$inferSelect;

// Relations
export const replitUsersRelations = relations(replitUsers, ({ many }) => ({
  userClaims: many(userClaims),
}));

export const userClaimsRelations = relations(userClaims, ({ one }) => ({
  user: one(replitUsers, {
    fields: [userClaims.userId],
    references: [replitUsers.id],
  }),
  claim: one(claims, {
    fields: [userClaims.claimId],
    references: [claims.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ many }) => ({
  events: many(sessionEvents),
  claims: many(claims),
  sourceUsage: many(sessionSourceUsage),
}));

export const sessionEventsRelations = relations(sessionEvents, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionEvents.sessionId],
    references: [sessions.id],
  }),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  session: one(sessions, {
    fields: [claims.sessionId],
    references: [sessions.id],
  }),
  lineItems: many(claimLineItems),
}));

export const claimLineItemsRelations = relations(claimLineItems, ({ one }) => ({
  claim: one(claims, {
    fields: [claimLineItems.claimId],
    references: [claims.id],
  }),
}));

export const sourcesRelations = relations(sources, ({ many }) => ({
  versions: many(sourceVersions),
  sessionUsage: many(sessionSourceUsage),
}));

export const sourceVersionsRelations = relations(sourceVersions, ({ one }) => ({
  source: one(sources, {
    fields: [sourceVersions.sourceId],
    references: [sources.id],
  }),
}));

export const sessionSourceUsageRelations = relations(sessionSourceUsage, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionSourceUsage.sessionId],
    references: [sessions.id],
  }),
  source: one(sources, {
    fields: [sessionSourceUsage.sourceId],
    references: [sources.id],
  }),
}));

// Pricing Data Points - Track all user inputs to refine pricing accuracy
export const pricingDataPoints = pgTable("pricing_data_points", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  unit: unitType("unit").notNull(),
  zipCode: char("zip_code", { length: 5 }),
  zipPrefix: char("zip_prefix", { length: 3 }),
  propertyAddress: text("property_address"),
  quotedPrice: numeric("quoted_price", { precision: 12, scale: 2 }).notNull().$type<number>(),
  fmvPrice: numeric("fmv_price", { precision: 12, scale: 2 }).notNull().$type<number>(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().$type<number>(),
  sessionId: varchar("session_id").references(() => sessions.id, { onDelete: "set null" }),
  source: text("source").default("user_upload"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryUnitIdx: index("pricing_data_category_unit_idx").on(table.category, table.unit),
  zipPrefixIdx: index("pricing_data_zip_prefix_idx").on(table.zipPrefix),
  createdAtIdx: index("pricing_data_created_at_idx").on(table.createdAt),
}));

export const insertPricingDataPointSchema = createInsertSchema(pricingDataPoints).omit({
  id: true,
  createdAt: true,
});

export type InsertPricingDataPoint = z.infer<typeof insertPricingDataPointSchema>;
export type PricingDataPoint = typeof pricingDataPoints.$inferSelect;

export const pricingDataPointsRelations = relations(pricingDataPoints, ({ one }) => ({
  session: one(sessions, {
    fields: [pricingDataPoints.sessionId],
    references: [sessions.id],
  }),
}));

// Partner billing status for admin dashboard filtering
export const billingStatus = pgEnum("billing_status", ["active", "past_due", "cancelled", "pending", "trial"]);

// Partners - Contractors, Adjusters, and Agencies applying for the network
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  type: partnerType("type").notNull(),
  tier: partnerTier("tier").default("advertiser").notNull(),
  contactPerson: text("contact_person").notNull(),
  email: text("email").notNull(),
  password: text("password"), // Hashed password for credential login
  emailVerified: integer("email_verified").default(0).$type<boolean>(), // Email verification status
  phone: text("phone").notNull(),
  website: text("website"),
  licenseNumber: text("license_number"),
  zipCode: varchar("zip_code", { length: 5 }), // Primary ZIP for filtering
  state: varchar("state", { length: 2 }), // State for grouping
  subType: text("sub_type"), // Specialty: roofing, plumbing, etc.
  orgMembership: text("org_membership"), // NRCA, AGC, NARI, etc.
  signingAgentId: varchar("signing_agent_id"), // Sales agent who signed this partner
  planId: text("plan_id").default("free"), // free, standard, premium
  billingStatus: billingStatus("billing_status").default("pending"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  serviceRegions: text("service_regions").array(), // Multiple service areas
  activeRegion: text("active_region"), // Currently active region for dashboard view
  adConfig: jsonb("ad_config").$type<{
    bannerSize?: string;
    placements?: string[];
    cpc?: number;
    monthlyBudget?: number;
    affiliatePct?: number;
  }>(),
  metrics: jsonb("metrics").$type<{
    impressions?: number;
    clicks?: number;
    leads?: number;
    conversions?: number;
    spendMTD?: number;
    spendYTD?: number;
    payoutsMTD?: number;
    payoutsYTD?: number;
  }>().default({}),
  status: partnerStatus("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("partners_email_idx").on(table.email),
  statusIdx: index("partners_status_idx").on(table.status),
  typeIdx: index("partners_type_idx").on(table.type),
  agentIdx: index("partners_agent_idx").on(table.signingAgentId),
  stateIdx: index("partners_state_idx").on(table.state),
  zipIdx: index("partners_zip_idx").on(table.zipCode),
  planIdx: index("partners_plan_idx").on(table.planId),
  billingIdx: index("partners_billing_idx").on(table.billingStatus),
}));

export const insertPartnerSchema = createInsertSchema(partners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPartner = z.infer<typeof insertPartnerSchema>;
export type Partner = typeof partners.$inferSelect;

// Partnership LOIs - Letter of Intent submissions with pricing preferences
export const partnershipLOIs = pgTable("partnership_lois", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id"), // Sales agent who signed this partner for commission tracking
  pricingPreferences: jsonb("pricing_preferences").notNull().$type<{
    cpc?: { enabled: boolean; amount: number; budgetPeriod: "daily" | "monthly"; budgetCap: number };
    affiliate?: { enabled: boolean; commissionPct: number; paymentTerms: string };
    monthlyBanner?: { enabled: boolean; amount: number; size: string; placement: string };
  }>(),
  notes: text("notes"),
  status: partnerStatus("status").default("pending").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
}, (table) => ({
  partnerIdx: index("partnership_lois_partner_idx").on(table.partnerId),
  statusIdx: index("partnership_lois_status_idx").on(table.status),
  agentIdx: index("partnership_lois_agent_idx").on(table.agentId),
}));

const pricingPreferencesSchema = z.object({
  cpc: z.object({
    enabled: z.boolean(),
    amount: z.number().optional(),
    budgetPeriod: z.enum(["daily", "monthly"]).optional(),
    budgetCap: z.number().optional(),
  }).optional(),
  affiliate: z.object({
    enabled: z.boolean(),
    commissionPct: z.number().optional(),
    paymentTerms: z.string().optional(),
  }).optional(),
  monthlyBanner: z.object({
    enabled: z.boolean(),
    amount: z.number().optional(),
    size: z.string().optional(),
    placement: z.string().optional(),
  }).optional(),
}).passthrough();

export const insertPartnershipLOISchema = createInsertSchema(partnershipLOIs).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
}).extend({
  pricingPreferences: pricingPreferencesSchema,
});

export type InsertPartnershipLOI = z.infer<typeof insertPartnershipLOISchema>;
export type PartnershipLOI = typeof partnershipLOIs.$inferSelect;

// Partner Leads - Track clicks, referrals, and conversions
export const partnerLeads = pgTable("partner_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").references(() => sessions.id, { onDelete: "set null" }),
  claimId: varchar("claim_id").references(() => claims.id, { onDelete: "set null" }),
  leadType: leadType("lead_type").notNull(),
  zipCode: varchar("zip_code", { length: 5 }),
  metadata: jsonb("metadata"),
  clickedAt: timestamp("clicked_at", { withTimezone: true }),
  convertedAt: timestamp("converted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  partnerIdx: index("partner_leads_partner_idx").on(table.partnerId),
  sessionIdx: index("partner_leads_session_idx").on(table.sessionId),
  typeIdx: index("partner_leads_type_idx").on(table.leadType),
  createdAtIdx: index("partner_leads_created_at_idx").on(table.createdAt),
  clickedAtIdx: index("partner_leads_clicked_at_idx").on(table.clickedAt),
}));

export const insertPartnerLeadSchema = createInsertSchema(partnerLeads).omit({
  id: true,
  createdAt: true,
});

export type InsertPartnerLead = z.infer<typeof insertPartnerLeadSchema>;
export type PartnerLead = typeof partnerLeads.$inferSelect;

// ZIP Targeting - Partner service areas with priority
export const zipTargeting = pgTable("zip_targeting", {
  partnerId: varchar("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  zipCode: varchar("zip_code", { length: 5 }).notNull(),
  priority: integer("priority").default(1).notNull(),
  weight: integer("weight").default(1).notNull(), // For rotation algorithm based on spend
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: index("zip_targeting_pk").on(table.partnerId, table.zipCode),
  zipIdx: index("zip_targeting_zip_idx").on(table.zipCode),
  zipPriorityIdx: index("zip_targeting_zip_priority_idx").on(table.zipCode, table.priority),
}));

export const insertZipTargetingSchema = createInsertSchema(zipTargeting).omit({
  createdAt: true,
});

export type InsertZipTargeting = z.infer<typeof insertZipTargetingSchema>;
export type ZipTargeting = typeof zipTargeting.$inferSelect;

// Partnership Relations
export const partnersRelations = relations(partners, ({ many }) => ({
  lois: many(partnershipLOIs),
  leads: many(partnerLeads),
  zipTargets: many(zipTargeting),
}));

export const partnershipLOIsRelations = relations(partnershipLOIs, ({ one }) => ({
  partner: one(partners, {
    fields: [partnershipLOIs.partnerId],
    references: [partners.id],
  }),
  reviewer: one(users, {
    fields: [partnershipLOIs.reviewedBy],
    references: [users.id],
  }),
}));

export const partnerLeadsRelations = relations(partnerLeads, ({ one }) => ({
  partner: one(partners, {
    fields: [partnerLeads.partnerId],
    references: [partners.id],
  }),
  session: one(sessions, {
    fields: [partnerLeads.sessionId],
    references: [sessions.id],
  }),
  claim: one(claims, {
    fields: [partnerLeads.claimId],
    references: [claims.id],
  }),
}));

export const zipTargetingRelations = relations(zipTargeting, ({ one }) => ({
  partner: one(partners, {
    fields: [zipTargeting.partnerId],
    references: [partners.id],
  }),
}));

// Price Audit Results - Store audit results for compliance and reporting
export const priceAuditResults = pgTable("price_audit_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  claimLineItemId: varchar("claim_line_item_id").references(() => claimLineItems.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").references(() => sessions.id, { onDelete: "set null" }),
  itemName: text("item_name").notNull(),
  matchedItem: text("matched_item"),
  userPrice: numeric("user_price", { precision: 12, scale: 2 }).notNull().$type<number>(),
  marketMin: numeric("market_min", { precision: 12, scale: 2 }).$type<number>(),
  marketAvg: numeric("market_avg", { precision: 12, scale: 2 }).$type<number>(),
  marketMax: numeric("market_max", { precision: 12, scale: 2 }).$type<number>(),
  unit: text("unit"),
  category: text("category"),
  flag: auditFlag("flag").notNull(),
  severity: auditSeverity("severity").notNull(),
  percentFromAvg: numeric("percent_from_avg", { precision: 6, scale: 2 }).$type<number>(),
  sampleSize: integer("sample_size"),
  zipCode: char("zip_code", { length: 5 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("price_audit_results_session_idx").on(table.sessionId),
  flagIdx: index("price_audit_results_flag_idx").on(table.flag),
  createdAtIdx: index("price_audit_results_created_at_idx").on(table.createdAt),
}));

export const insertPriceAuditResultSchema = createInsertSchema(priceAuditResults).omit({
  id: true,
  createdAt: true,
});

export type InsertPriceAuditResult = z.infer<typeof insertPriceAuditResultSchema>;
export type PriceAuditResult = typeof priceAuditResults.$inferSelect;

export const priceAuditResultsRelations = relations(priceAuditResults, ({ one }) => ({
  claimLineItem: one(claimLineItems, {
    fields: [priceAuditResults.claimLineItemId],
    references: [claimLineItems.id],
  }),
  session: one(sessions, {
    fields: [priceAuditResults.sessionId],
    references: [sessions.id],
  }),
}));

// Form data type for multi-step form
export const claimFormSchema = z.object({
  zipCode: z.string().min(5, "ZIP code must be at least 5 digits"),
  propertyAddress: z.string().optional(),
  items: z.array(z.object({
    category: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit: z.enum(["LF", "SF", "SQ", "CT", "EA"]).default("EA"),
    quotedPrice: z.number().min(0, "Price must be positive"),
  })).min(1, "Add at least one item"),
});

export type ClaimFormData = z.infer<typeof claimFormSchema>;

// Unit type helpers
export const UNIT_TYPES = {
  LF: { label: "Linear Feet", abbr: "LF", description: "Measured in linear feet (e.g., fencing, piping)" },
  SF: { label: "Square Feet", abbr: "SF", description: "Measured in square feet (e.g., flooring, painting)" },
  SQ: { label: "Roofing Squares", abbr: "SQ", description: "100 square feet per square (roofing only)" },
  CT: { label: "Count/Units", abbr: "CT", description: "Individual items (e.g., windows, doors, appliances)" },
  EA: { label: "Each", abbr: "EA", description: "Single units or items" },
} as const;

// ============================================
// MONETIZATION SYSTEM - Sales Force & Commissions
// ============================================

// Monetization Enums
export const monetizationTier = pgEnum("monetization_tier", ["free_bogo", "standard", "premium"]);
export const agentStatus = pgEnum("agent_status", ["active", "inactive", "suspended"]);
export const commissionType = pgEnum("commission_type", ["deal_close", "renewal", "bonus", "manual"]);
export const commissionStatus = pgEnum("commission_status", ["pending", "approved", "paid", "disputed"]);
export const payoutStatus = pgEnum("payout_status", ["pending", "processing", "completed", "failed"]);
export const payoutMethod = pgEnum("payout_method", ["stripe_connect", "bank_transfer", "check"]);
export const renewalStatus = pgEnum("renewal_status", ["pending", "confirmed", "failed", "cancelled"]);
export const invoiceStatus = pgEnum("invoice_status", ["unpaid", "paid", "overdue", "failed", "cancelled"]);

// Agent Commission Tiers - Defines commission rate structures
export const agentCommissionTiers = pgTable("agent_commission_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  baseRate: numeric("base_rate", { precision: 4, scale: 2 }).notNull().$type<number>(),
  bonusThresholds: jsonb("bonus_thresholds").$type<Array<{
    annualRevenue: number;
    bonusRate: number;
  }>>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertAgentCommissionTierSchema = createInsertSchema(agentCommissionTiers).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentCommissionTier = z.infer<typeof insertAgentCommissionTierSchema>;
export type AgentCommissionTier = typeof agentCommissionTiers.$inferSelect;

// Sales Agents - Track sales/development team members
export const salesAgents = pgTable("sales_agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentRefCode: text("agent_ref_code").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"), // Hashed password for credential login
  emailVerified: integer("email_verified").default(0).$type<boolean>(), // Email verification status
  phone: text("phone"),
  region: text("region"),
  serviceRegions: text("service_regions").array(), // Multiple service areas for Local Resources
  activeRegion: text("active_region"), // Currently active region for dashboard view
  birthYear: integer("birth_year"),
  commissionTierId: varchar("commission_tier_id").references(() => agentCommissionTiers.id),
  stripeConnectId: text("stripe_connect_id").unique(),
  status: agentStatus("status").default("active").notNull(),
  totalEarned: numeric("total_earned", { precision: 12, scale: 2 }).default("0").$type<number>(),
  ytdEarnings: numeric("ytd_earnings", { precision: 12, scale: 2 }).default("0").$type<number>(),
  notes: text("notes"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("sales_agents_email_idx").on(table.email),
  statusIdx: index("sales_agents_status_idx").on(table.status),
  regionIdx: index("sales_agents_region_idx").on(table.region),
  refCodeIdx: index("sales_agents_ref_code_idx").on(table.agentRefCode),
}));

export const insertSalesAgentSchema = createInsertSchema(salesAgents).omit({
  id: true,
  totalEarned: true,
  ytdEarnings: true,
  createdAt: true,
  updatedAt: true,
  joinedAt: true,
});

export type InsertSalesAgent = z.infer<typeof insertSalesAgentSchema>;
export type SalesAgent = typeof salesAgents.$inferSelect;

// Partner Contracts - Links partners to monetization tier, pricing, and agent
export const partnerContracts = pgTable("partner_contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").references(() => salesAgents.id, { onDelete: "set null" }),
  monetizationTier: monetizationTier("monetization_tier").default("free_bogo").notNull(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  baseMonthly: numeric("base_monthly", { precision: 10, scale: 2 }).default("0").$type<number>(),
  setupFee: numeric("setup_fee", { precision: 10, scale: 2 }).default("0").$type<number>(),
  upfrontDiscount: numeric("upfront_discount", { precision: 4, scale: 2 }).default("0").$type<number>(),
  rotationWeight: numeric("rotation_weight", { precision: 4, scale: 2 }).default("1.0").$type<number>(),
  adSlots: integer("ad_slots").default(1),
  impressionsGuaranteed: integer("impressions_guaranteed"),
  durationMonths: integer("duration_months").default(12),
  commissionRate: numeric("commission_rate", { precision: 4, scale: 2 }).default("0.20").$type<number>(),
  isBogo: integer("is_bogo").default(0).$type<boolean>(),
  bogoFreeMonth: integer("bogo_free_month").default(0).$type<boolean>(),
  autoRenew: integer("auto_renew").default(1).$type<boolean>(),
  contractStart: timestamp("contract_start", { withTimezone: true }),
  contractEnd: timestamp("contract_end", { withTimezone: true }),
  renewalDate: timestamp("renewal_date", { withTimezone: true }),
  status: partnerStatus("status").default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  partnerIdx: index("partner_contracts_partner_idx").on(table.partnerId),
  agentIdx: index("partner_contracts_agent_idx").on(table.agentId),
  tierIdx: index("partner_contracts_tier_idx").on(table.monetizationTier),
  statusIdx: index("partner_contracts_status_idx").on(table.status),
  renewalIdx: index("partner_contracts_renewal_idx").on(table.renewalDate),
}));

export const insertPartnerContractSchema = createInsertSchema(partnerContracts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPartnerContract = z.infer<typeof insertPartnerContractSchema>;
export type PartnerContract = typeof partnerContracts.$inferSelect;

// Partner Invoices - Billing history for partner payments
export const partnerInvoices = pgTable("partner_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => partnerContracts.id, { onDelete: "cascade" }),
  partnerId: varchar("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().$type<number>(),
  invoiceDate: timestamp("invoice_date", { withTimezone: true }).defaultNow().notNull(),
  dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
  status: invoiceStatus("status").default("unpaid").notNull(),
  stripeInvoiceId: text("stripe_invoice_id").unique(),
  stripeChargeId: text("stripe_charge_id").unique(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (table) => ({
  contractIdx: index("partner_invoices_contract_idx").on(table.contractId),
  partnerIdx: index("partner_invoices_partner_idx").on(table.partnerId),
  statusIdx: index("partner_invoices_status_idx").on(table.status),
  dueDateIdx: index("partner_invoices_due_date_idx").on(table.dueDate),
}));

export const insertPartnerInvoiceSchema = createInsertSchema(partnerInvoices).omit({
  id: true,
  createdAt: true,
  paidAt: true,
});

export type InsertPartnerInvoice = z.infer<typeof insertPartnerInvoiceSchema>;
export type PartnerInvoice = typeof partnerInvoices.$inferSelect;

// Agent Commissions - Track commissions earned by agents
export const agentCommissions = pgTable("agent_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => salesAgents.id, { onDelete: "cascade" }),
  partnerId: varchar("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  contractId: varchar("contract_id").references(() => partnerContracts.id, { onDelete: "set null" }),
  invoiceId: varchar("invoice_id").references(() => partnerInvoices.id, { onDelete: "set null" }),
  commissionType: commissionType("commission_type").notNull(),
  rate: numeric("rate", { precision: 4, scale: 2 }).notNull().$type<number>(),
  baseAmount: numeric("base_amount", { precision: 10, scale: 2 }).notNull().$type<number>(),
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }).notNull().$type<number>(),
  status: commissionStatus("status").default("pending").notNull(),
  dateEarned: timestamp("date_earned", { withTimezone: true }).defaultNow().notNull(),
  datePaid: timestamp("date_paid", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  agentIdx: index("agent_commissions_agent_idx").on(table.agentId),
  partnerIdx: index("agent_commissions_partner_idx").on(table.partnerId),
  typeIdx: index("agent_commissions_type_idx").on(table.commissionType),
  statusIdx: index("agent_commissions_status_idx").on(table.status),
  dateEarnedIdx: index("agent_commissions_date_earned_idx").on(table.dateEarned),
}));

export const insertAgentCommissionSchema = createInsertSchema(agentCommissions).omit({
  id: true,
  createdAt: true,
  datePaid: true,
});

export type InsertAgentCommission = z.infer<typeof insertAgentCommissionSchema>;
export type AgentCommission = typeof agentCommissions.$inferSelect;

// Agent Payouts - Track payments to agents via Stripe Connect
export const agentPayouts = pgTable("agent_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => salesAgents.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().$type<number>(),
  payoutMethod: payoutMethod("payout_method").default("stripe_connect").notNull(),
  stripePayoutId: text("stripe_payout_id").unique(),
  stripeTransferId: text("stripe_transfer_id").unique(),
  status: payoutStatus("status").default("pending").notNull(),
  notes: text("notes"),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  agentIdx: index("agent_payouts_agent_idx").on(table.agentId),
  statusIdx: index("agent_payouts_status_idx").on(table.status),
  scheduledIdx: index("agent_payouts_scheduled_idx").on(table.scheduledAt),
}));

export const insertAgentPayoutSchema = createInsertSchema(agentPayouts).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertAgentPayout = z.infer<typeof insertAgentPayoutSchema>;
export type AgentPayout = typeof agentPayouts.$inferSelect;

// Partner Renewals - Track auto-renewal workflow (insurance-style)
export const partnerRenewals = pgTable("partner_renewals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").notNull().references(() => partnerContracts.id, { onDelete: "cascade" }),
  partnerId: varchar("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  agentId: varchar("agent_id").references(() => salesAgents.id, { onDelete: "set null" }),
  renewalDate: timestamp("renewal_date", { withTimezone: true }).notNull(),
  newContractStart: timestamp("new_contract_start", { withTimezone: true }),
  newContractEnd: timestamp("new_contract_end", { withTimezone: true }),
  status: renewalStatus("status").default("pending").notNull(),
  invoiceId: varchar("invoice_id").references(() => partnerInvoices.id, { onDelete: "set null" }),
  commissionId: varchar("commission_id").references(() => agentCommissions.id, { onDelete: "set null" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
}, (table) => ({
  contractIdx: index("partner_renewals_contract_idx").on(table.contractId),
  partnerIdx: index("partner_renewals_partner_idx").on(table.partnerId),
  agentIdx: index("partner_renewals_agent_idx").on(table.agentId),
  statusIdx: index("partner_renewals_status_idx").on(table.status),
  renewalDateIdx: index("partner_renewals_renewal_date_idx").on(table.renewalDate),
}));

export const insertPartnerRenewalSchema = createInsertSchema(partnerRenewals).omit({
  id: true,
  createdAt: true,
  processedAt: true,
});

export type InsertPartnerRenewal = z.infer<typeof insertPartnerRenewalSchema>;
export type PartnerRenewal = typeof partnerRenewals.$inferSelect;

// BOGO Member Organizations - Free tier from public org membership lists
export const bogoOrganizations = pgTable("bogo_organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  category: text("category").notNull(),
  region: text("region"),
  website: text("website"),
  memberListUrl: text("member_list_url"),
  membersCount: integer("members_count").default(0),
  rotationWeight: numeric("rotation_weight", { precision: 4, scale: 2 }).default("0.5").$type<number>(),
  status: agentStatus("status").default("active").notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("bogo_orgs_category_idx").on(table.category),
  regionIdx: index("bogo_orgs_region_idx").on(table.region),
  statusIdx: index("bogo_orgs_status_idx").on(table.status),
}));

export const insertBogoOrganizationSchema = createInsertSchema(bogoOrganizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export type InsertBogoOrganization = z.infer<typeof insertBogoOrganizationSchema>;
export type BogoOrganization = typeof bogoOrganizations.$inferSelect;

// Monetization Relations
export const salesAgentsRelations = relations(salesAgents, ({ one, many }) => ({
  commissionTier: one(agentCommissionTiers, {
    fields: [salesAgents.commissionTierId],
    references: [agentCommissionTiers.id],
  }),
  contracts: many(partnerContracts),
  commissions: many(agentCommissions),
  payouts: many(agentPayouts),
  renewals: many(partnerRenewals),
}));

export const partnerContractsRelations = relations(partnerContracts, ({ one, many }) => ({
  partner: one(partners, {
    fields: [partnerContracts.partnerId],
    references: [partners.id],
  }),
  agent: one(salesAgents, {
    fields: [partnerContracts.agentId],
    references: [salesAgents.id],
  }),
  invoices: many(partnerInvoices),
  renewals: many(partnerRenewals),
}));

export const partnerInvoicesRelations = relations(partnerInvoices, ({ one }) => ({
  contract: one(partnerContracts, {
    fields: [partnerInvoices.contractId],
    references: [partnerContracts.id],
  }),
  partner: one(partners, {
    fields: [partnerInvoices.partnerId],
    references: [partners.id],
  }),
}));

export const agentCommissionsRelations = relations(agentCommissions, ({ one }) => ({
  agent: one(salesAgents, {
    fields: [agentCommissions.agentId],
    references: [salesAgents.id],
  }),
  partner: one(partners, {
    fields: [agentCommissions.partnerId],
    references: [partners.id],
  }),
  contract: one(partnerContracts, {
    fields: [agentCommissions.contractId],
    references: [partnerContracts.id],
  }),
  invoice: one(partnerInvoices, {
    fields: [agentCommissions.invoiceId],
    references: [partnerInvoices.id],
  }),
}));

export const agentPayoutsRelations = relations(agentPayouts, ({ one }) => ({
  agent: one(salesAgents, {
    fields: [agentPayouts.agentId],
    references: [salesAgents.id],
  }),
}));

export const partnerRenewalsRelations = relations(partnerRenewals, ({ one }) => ({
  contract: one(partnerContracts, {
    fields: [partnerRenewals.contractId],
    references: [partnerContracts.id],
  }),
  partner: one(partners, {
    fields: [partnerRenewals.partnerId],
    references: [partners.id],
  }),
  agent: one(salesAgents, {
    fields: [partnerRenewals.agentId],
    references: [salesAgents.id],
  }),
  invoice: one(partnerInvoices, {
    fields: [partnerRenewals.invoiceId],
    references: [partnerInvoices.id],
  }),
  commission: one(agentCommissions, {
    fields: [partnerRenewals.commissionId],
    references: [agentCommissions.id],
  }),
}));

// Ad Rotation - Track which partners show in which ZIP codes
export const adRotations = pgTable("ad_rotations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  contractId: varchar("contract_id").references(() => partnerContracts.id, { onDelete: "set null" }),
  zipCode: text("zip_code").notNull(),
  weight: numeric("weight", { precision: 4, scale: 2 }).default("1.0").$type<number>(),
  rotationOrder: integer("rotation_order").default(0),
  status: agentStatus("status").default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  partnerIdx: index("ad_rotations_partner_idx").on(table.partnerId),
  zipIdx: index("ad_rotations_zip_idx").on(table.zipCode),
  weightIdx: index("ad_rotations_weight_idx").on(table.weight),
}));

export const insertAdRotationSchema = createInsertSchema(adRotations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAdRotation = z.infer<typeof insertAdRotationSchema>;
export type AdRotation = typeof adRotations.$inferSelect;

// Ad Impressions - Track every time a partner is shown to users
export const adImpressions = pgTable("ad_impressions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  partnerId: varchar("partner_id").notNull().references(() => partners.id, { onDelete: "cascade" }),
  contractId: varchar("contract_id").references(() => partnerContracts.id, { onDelete: "set null" }),
  rotationId: varchar("rotation_id").references(() => adRotations.id, { onDelete: "set null" }),
  zipCode: text("zip_code").notNull(),
  sessionId: varchar("session_id"),
  clickthrough: integer("clickthrough").default(0).$type<boolean>(),
  referralType: text("referral_type"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  partnerIdx: index("ad_impressions_partner_idx").on(table.partnerId),
  zipIdx: index("ad_impressions_zip_idx").on(table.zipCode),
  timestampIdx: index("ad_impressions_timestamp_idx").on(table.timestamp),
  clickthroughIdx: index("ad_impressions_clickthrough_idx").on(table.clickthrough),
}));

export const insertAdImpressionSchema = createInsertSchema(adImpressions).omit({
  id: true,
  timestamp: true,
});

export type InsertAdImpression = z.infer<typeof insertAdImpressionSchema>;
export type AdImpression = typeof adImpressions.$inferSelect;

// Ad Rotation Relations
export const adRotationsRelations = relations(adRotations, ({ one, many }) => ({
  partner: one(partners, {
    fields: [adRotations.partnerId],
    references: [partners.id],
  }),
  contract: one(partnerContracts, {
    fields: [adRotations.contractId],
    references: [partnerContracts.id],
  }),
  impressions: many(adImpressions),
}));

export const adImpressionsRelations = relations(adImpressions, ({ one }) => ({
  partner: one(partners, {
    fields: [adImpressions.partnerId],
    references: [partners.id],
  }),
  contract: one(partnerContracts, {
    fields: [adImpressions.contractId],
    references: [partnerContracts.id],
  }),
  rotation: one(adRotations, {
    fields: [adImpressions.rotationId],
    references: [adRotations.id],
  }),
}));

// Commission rate helper constants
export const COMMISSION_RATES = {
  starter: { base: 0.15, thresholds: [{ annual: 50000, rate: 0.17 }, { annual: 100000, rate: 0.20 }] },
  standard: { base: 0.20, thresholds: [{ annual: 100000, rate: 0.25 }, { annual: 200000, rate: 0.30 }] },
  elite: { base: 0.30, thresholds: [{ annual: 200000, rate: 0.35 }, { annual: 500000, rate: 0.40 }] },
} as const;

// Monetization tier weight constants
export const MONETIZATION_WEIGHTS = {
  free_bogo: 0.5,
  standard: 1.0,
  premium: 2.0,
} as const;

// ============================================
// PRO ORGANIZATIONS DATABASE - Sales Lead Sources
// ============================================

// Pro Organization Categories
export const proOrgCategory = pgEnum("pro_org_category", [
  "general_contractors",
  "remodelers", 
  "roofers",
  "public_adjusters",
  "attorneys",
  "disaster_recovery",
  "regulator",
  "disaster",
  "licensing",
  "plumbers",
  "electricians",
  "hvac",
  "flooring",
  "painters",
  "restoration",
  "windows_doors",
  "tree_services",
  "appliance_repair"
]);

// Disaster Risk Tiers for state prioritization
export const disasterRiskTier = pgEnum("disaster_risk_tier", [
  "critical",
  "high",
  "moderate",
  "low"
]);

// Pro Organization Scope (geographic coverage)
export const proOrgScope = pgEnum("pro_org_scope", [
  "national",
  "regional",
  "state",
  "local"
]);

// Pro Organizations - Professional associations for agent lead prospecting
export const proOrganizations = pgTable("pro_organizations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: proOrgCategory("category").notNull(),
  scope: proOrgScope("scope").notNull(),
  state: varchar("state", { length: 2 }),
  city: text("city"),
  website: text("website"),
  memberDirectoryUrl: text("member_directory_url"),
  directoryUrl: text("directory_url"),
  chapterMapUrl: text("chapter_map_url"),
  chapterInfoUrl: text("chapter_info_url"),
  parentId: varchar("parent_id"),
  regions: text("regions").array(),
  states: text("states").array(),
  priority: integer("priority").default(1),
  primaryHazards: text("primary_hazards").array(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
  tradeSpecialties: text("trade_specialties").array(),
  disasterSpecialties: text("disaster_specialties").array(),
  certifications: text("certifications").array(),
  emergencyServices: integer("emergency_services").default(0).$type<boolean>(),
  stateBoards: jsonb("state_boards").$type<Record<string, string>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("pro_orgs_category_idx").on(table.category),
  stateIdx: index("pro_orgs_state_idx").on(table.state),
  scopeIdx: index("pro_orgs_scope_idx").on(table.scope),
  parentIdx: index("pro_orgs_parent_idx").on(table.parentId),
  priorityIdx: index("pro_orgs_priority_idx").on(table.priority),
}));

export const insertProOrganizationSchema = createInsertSchema(proOrganizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProOrganization = z.infer<typeof insertProOrganizationSchema>;
export type ProOrganization = typeof proOrganizations.$inferSelect;

// Email Templates - Outreach templates for sales agents
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  category: text("category").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  placeholders: text("placeholders").array(),
  isActive: integer("is_active").default(1).$type<boolean>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index("email_templates_category_idx").on(table.category),
  activeIdx: index("email_templates_active_idx").on(table.isActive),
}));

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// Batch Job Status enum for async processing
export const batchJobStatus = pgEnum("batch_job_status", [
  "queued",
  "processing",
  "completed",
  "failed"
]);

// Batch Jobs - Async processing queue for large claim audits
export const batchJobs = pgTable("batch_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  status: batchJobStatus("status").default("queued").notNull(),
  itemCount: integer("item_count").notNull(),
  processedCount: integer("processed_count").default(0).notNull(),
  zipCode: char("zip_code", { length: 5 }),
  inputData: jsonb("input_data").notNull(),
  results: jsonb("results"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  statusIdx: index("batch_jobs_status_idx").on(table.status),
  createdAtIdx: index("batch_jobs_created_at_idx").on(table.createdAt),
}));

export const insertBatchJobSchema = createInsertSchema(batchJobs).omit({
  id: true,
  status: true,
  processedCount: true,
  results: true,
  error: true,
  startedAt: true,
  completedAt: true,
  createdAt: true,
});

export type InsertBatchJob = z.infer<typeof insertBatchJobSchema>;
export type BatchJob = typeof batchJobs.$inferSelect;

// ============================================
// AUTH TOKENS - Password Reset & Email Verification
// ============================================

// Token type enum
export const tokenType = pgEnum("token_type", ["password_reset", "email_verification"]);

// Password Reset Tokens - For forgot password flow
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  userType: text("user_type").notNull(), // 'agent' or 'partner'
  userId: varchar("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("password_reset_token_idx").on(table.token),
  emailIdx: index("password_reset_email_idx").on(table.email),
  expiresIdx: index("password_reset_expires_idx").on(table.expiresAt),
}));

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  usedAt: true,
  createdAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Email Verification Tokens - For email verification flow
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  userType: text("user_type").notNull(), // 'agent' or 'partner'
  userId: varchar("user_id").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("email_verification_token_idx").on(table.token),
  emailIdx: index("email_verification_email_idx").on(table.email),
  expiresIdx: index("email_verification_expires_idx").on(table.expiresAt),
}));

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  verifiedAt: true,
  createdAt: true,
});

export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;
