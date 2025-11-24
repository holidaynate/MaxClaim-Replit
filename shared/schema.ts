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
