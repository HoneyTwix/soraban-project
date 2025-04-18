import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { categorizationRules, transactions, transactionCategories } from "~/server/db/schema";
import { eq, and, isNull, gte } from "drizzle-orm";

// Rule evaluation functions
async function evaluateRule(rule: typeof categorizationRules.$inferSelect, transaction: typeof transactions.$inferSelect): Promise<boolean> {
  switch (rule.conditionType) {
    case "description":
      if (rule.conditionSubtype === "contains") {
        return transaction.description?.toLowerCase().includes(rule.conditionValue.toLowerCase()) ?? false;
      }
      break;
    case "amount":
      const amount = parseFloat(transaction.amount.toString());
      const conditionValue = parseFloat(rule.conditionValue);
      switch (rule.conditionSubtype) {
        case "greater_than":
          return amount > conditionValue;
        case "less_than":
          return amount < conditionValue;
        case "equals":
          return amount === conditionValue;
        case "greater_than_or_equal":
          return amount >= conditionValue;
        case "less_than_or_equal":
          return amount <= conditionValue;
      }
      break;
    case "date":
      const date = transaction.date;
      const conditionDate = new Date(rule.conditionValue);
      const optionalDate = rule.optionalConditionValue ? new Date(rule.optionalConditionValue) : null;
      
      switch (rule.conditionSubtype) {
        case "before":
          return date < conditionDate;
        case "after":
          return date > conditionDate;
        case "between":
          return optionalDate ? date >= conditionDate && date <= optionalDate : false;
        case "not_between":
          return optionalDate ? date < conditionDate || date > optionalDate : false;
      }
      break;
  }
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
      });
    }),

  createCategorizationRule: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string(),
        conditionType: z.enum(["description", "amount", "date"]),
        conditionSubtype: z.enum([
          "contains",
          "greater_than",
          "less_than",
          "equals",
          "not_equals",
          "before",
          "after",
          "between",
          "not_between",
          "greater_than_or_equal",
          "less_than_or_equal"
        ]),
        conditionValue: z.string(),
        optionalConditionValue: z.string().optional(),
        aiPrompt: z.string().optional(),
        categoryId: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.insert(categorizationRules).values(input);
    }),

  updateCategorizationRule: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        ruleId: z.string(),
        name: z.string().optional(),
        conditionType: z.enum(["description", "amount", "date"]).optional(),
        conditionSubtype: z.enum([
          "contains",
          "greater_than",
          "less_than",
          "equals",
          "not_equals",
          "before",
          "after",
          "between",
          "not_between",
          "greater_than_or_equal",
          "less_than_or_equal"
        ]).optional(),
        conditionValue: z.string().optional(),
        optionalConditionValue: z.string().optional(),
        aiPrompt: z.string().optional(),
        categoryId: z.string().optional(),
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

  // Apply rules to transactions
  applyRules: publicProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ input }) => {
      // Get all categorization rules
      const rules = await db.query.categorizationRules.findMany({
        where: eq(categorizationRules.userId, input.userId),
        with: {
          category: true,
        },
      });

      // Get transactions without categories
      const uncategorized = await db.query.transactions.findMany({
        where: eq(transactions.userId, input.userId),
      });

      // Apply rules to transactions
      for (const transaction of uncategorized) {
        for (const rule of rules) {
          const matches = await evaluateRule(rule, transaction);
          if (matches && rule.categoryId) {
            // Add category to transaction
            await db.insert(transactionCategories).values({
              transactionId: transaction.id,
              categoryId: rule.categoryId,
              addedBy: "rule",
              ruleId: rule.id,
            });
          }
        }
      }
    }),
}); 