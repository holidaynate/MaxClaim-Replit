import { sql } from "drizzle-orm";
import { pgTable, text, varchar, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Claim line items
export const claimItems = pgTable("claim_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: text("category").notNull(),
  description: text("description").notNull(),
  quantity: numeric("quantity").notNull(),
  quotedPrice: numeric("quoted_price").notNull(),
  fmvPrice: numeric("fmv_price").notNull(),
  zipCode: text("zip_code").notNull(),
});

export const insertClaimItemSchema = createInsertSchema(claimItems).omit({
  id: true,
});

export type InsertClaimItem = z.infer<typeof insertClaimItemSchema>;
export type ClaimItem = typeof claimItems.$inferSelect;

// Form data type for multi-step form
export const claimFormSchema = z.object({
  zipCode: z.string().min(5, "ZIP code must be at least 5 digits"),
  items: z.array(z.object({
    category: z.string().min(1, "Category is required"),
    description: z.string().min(1, "Description is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    quotedPrice: z.number().min(0, "Price must be positive"),
  })).min(1, "Add at least one item"),
});

export type ClaimFormData = z.infer<typeof claimFormSchema>;
