import { sql } from "drizzle-orm";
import { index, pgTableCreator, text, timestamp, uuid, decimal, boolean, jsonb } from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `soraban-project_${name}`);

// Users table
export const users = createTable(
  "user",
  (d) => ({
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [index("email_idx").on(t.email)],
);

// Categories table
export const categories = createTable(
  "category",
  (d) => ({
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    userId: uuid("user_id").references(() => users.id).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_id_idx").on(t.userId),
    index("name_idx").on(t.name),
  ],
);

// Transactions table
export const transactions = createTable(
  "transaction",
  (d) => ({
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    amount: decimal("amount", { precision: 19, scale: 4 }).notNull(),
    description: text("description"),
    date: timestamp("date", { withTimezone: true }).notNull(),
    categoryId: uuid("category_id").references(() => categories.id),
    isFlagged: boolean("is_flagged").default(false).notNull(),
    flagReason: text("flag_reason"),
    metadata: jsonb("metadata"),
    source: text("source").notNull(), // 'manual' or 'csv'
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_id_idx").on(t.userId),
    index("date_idx").on(t.date),
    index("category_id_idx").on(t.categoryId),
    index("is_flagged_idx").on(t.isFlagged),
  ],
);

// Categorization rules table
export const categorizationRules = createTable(
  "categorization_rule",
  (d) => ({
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    categoryId: uuid("category_id").references(() => categories.id).notNull(),
    condition: jsonb("condition").notNull(), // Store rule conditions as JSON
    priority: d.integer("priority").notNull().default(0),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_id_idx").on(t.userId),
    index("category_id_idx").on(t.categoryId),
  ],
);

// Anomaly detection rules table
export const anomalyRules = createTable(
  "anomaly_rule",
  (d) => ({
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    condition: jsonb("condition").notNull(), // Store anomaly detection conditions
    severity: text("severity").notNull(), // 'low', 'medium', 'high'
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("user_id_idx").on(t.userId),
  ],
);

// Transaction reviews table
export const transactionReviews = createTable(
  "transaction_review",
  (d) => ({
    id: uuid("id").primaryKey().defaultRandom(),
    transactionId: uuid("transaction_id").references(() => transactions.id).notNull(),
    userId: uuid("user_id").references(() => users.id).notNull(),
    status: text("status").notNull(), // 'pending', 'approved', 'rejected'
    notes: text("notes"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .$onUpdate(() => new Date()),
  }),
  (t) => [
    index("transaction_id_idx").on(t.transactionId),
    index("user_id_idx").on(t.userId),
    index("status_idx").on(t.status),
  ],
);