import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { categorizationRules, anomalyRules, transactions } from "~/server/db/schema";
import { eq, and, isNull, gte } from "drizzle-orm";

// Rule evaluation functions
async function evaluateRule(condition: Record<string, unknown>, transaction: typeof transactions.$inferSelect): Promise<boolean> {
  // Implement rule evaluation logic
  return false;
}

async function evaluateAnomalyRule(condition: Record<string, unknown>, transaction: typeof transactions.$inferSelect): Promise<boolean> {
  // Implement anomaly detection logic
  return false;
}

export const ruleRouter = createTRPCRouter({
  // Categorization Rules
  getCategorizationRules: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return db.query.categorizationRules.findMany({
        where: eq(categorizationRules.userId, input.userId),
        with: {
          category: true,
        },
        orderBy: (rules) => rules.priority,
      });
    }),

  createCategorizationRule: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        categoryId: z.string(),
        condition: z.record(z.unknown()),
        priority: z.number().default(0),
      }),
    )
    .mutation(async ({ input }) => {
      return db.insert(categorizationRules).values({
        ...input,
        isActive: true,
      });
    }),

  updateCategorizationRule: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        ruleId: z.string(),
        categoryId: z.string().optional(),
        condition: z.record(z.unknown()).optional(),
        priority: z.number().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { ruleId, userId, ...data } = input;
      return db
        .update(categorizationRules)
        .set(data)
        .where(
          and(
            eq(categorizationRules.id, ruleId),
            eq(categorizationRules.userId, userId),
          ),
        );
    }),

  // Anomaly Detection Rules
  getAnomalyRules: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return db.query.anomalyRules.findMany({
        where: eq(anomalyRules.userId, input.userId),
        orderBy: (rules) => rules.name,
      });
    }),

  createAnomalyRule: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        condition: z.record(z.unknown()),
        severity: z.enum(["low", "medium", "high"]),
      }),
    )
    .mutation(async ({ input }) => {
      return db.insert(anomalyRules).values({
        ...input,
        isActive: true,
      });
    }),

  updateAnomalyRule: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        ruleId: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        condition: z.record(z.unknown()).optional(),
        severity: z.enum(["low", "medium", "high"]).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { ruleId, userId, ...data } = input;
      return db
        .update(anomalyRules)
        .set(data)
        .where(
          and(
            eq(anomalyRules.id, ruleId),
            eq(anomalyRules.userId, userId),
          ),
        );
    }),

  // Apply rules to uncategorized transactions
  applyRules: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      // Get all active categorization rules
      const rules = await db.query.categorizationRules.findMany({
        where: and(
          eq(categorizationRules.userId, input.userId),
          eq(categorizationRules.isActive, true),
        ),
        with: {
          category: true,
        },
        orderBy: (rules) => rules.priority,
      });

      // Get uncategorized transactions
      const uncategorized = await db.query.transactions.findMany({
        where: and(
          eq(transactions.userId, input.userId),
          isNull(transactions.categoryId),
        ),
      });

      // Apply rules to transactions
      for (const transaction of uncategorized) {
        for (const rule of rules) {
          const matches = await evaluateRule(rule.condition as Record<string, unknown>, transaction);
          if (matches) {
            await db
              .update(transactions)
              .set({ categoryId: rule.categoryId })
              .where(eq(transactions.id, transaction.id));
            break;
          }
        }
      }
    }),

  // Check for anomalies
  checkAnomalies: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        days: z.number().default(30),
      }),
    )
    .mutation(async ({ input }) => {
      // Get all active anomaly rules
      const rules = await db.query.anomalyRules.findMany({
        where: and(
          eq(anomalyRules.userId, input.userId),
          eq(anomalyRules.isActive, true),
        ),
      });

      // Get recent transactions
      const recentTransactions = await db.query.transactions.findMany({
        where: and(
          eq(transactions.userId, input.userId),
          gte(transactions.date, new Date(Date.now() - input.days * 24 * 60 * 60 * 1000)),
        ),
      });

      // Check for anomalies
      for (const transaction of recentTransactions) {
        for (const rule of rules) {
          const isAnomaly = await evaluateAnomalyRule(rule.condition as Record<string, unknown>, transaction);
          if (isAnomaly) {
            await db
              .update(transactions)
              .set({
                isFlagged: true,
                flagReason: rule.name,
              })
              .where(eq(transactions.id, transaction.id));
          }
        }
      }
    }),
}); 