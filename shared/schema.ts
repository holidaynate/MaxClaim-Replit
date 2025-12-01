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

// Users table (keep existing structure)
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

// Partners - Contractors, Adjusters, and Agencies applying for the network
export const partners = pgTable("partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name").notNull(),
  type: partnerType("type").notNull(),
  tier: partnerTier("tier").default("advertiser").notNull(),
  contactPerson: text("contact_person").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  website: text("website"),
  licenseNumber: text("license_number"),
  status: partnerStatus("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: index("partners_email_idx").on(table.email),
  statusIdx: index("partners_status_idx").on(table.status),
  typeIdx: index("partners_type_idx").on(table.type),
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
  zipCode: char("zip_code", { length: 5 }),
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
  zipCode: char("zip_code", { length: 5 }).notNull(),
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
