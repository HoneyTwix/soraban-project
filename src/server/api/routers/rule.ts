import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { categorizationRules, transactions, transactionCategories, categories } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

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
    case "ai":
      if (!rule.categoryId) return false;
      
      const category = await db.query.categories.findFirst({
        where: eq(categories.id, rule.categoryId),
      });

      if (!category) return false;

      try {
        const response = await fetch("/api/llm-route", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transaction_date: transaction.date.toISOString(),
            transaction_description: transaction.description ?? "",
            transaction_amount: transaction.amount.toString(),
            category: {
              name: category.name,
              description: category.description ?? undefined,
            },
            ai_prompt: rule.aiPrompt ?? undefined,
          }),
        });

        if (!response.ok) {
          throw new Error(`AI evaluation failed: ${response.statusText}`);
        }

        const result = (await response.json()) as { decision: "apply" | "do not apply" };
        return result.decision === "apply";
      } catch (error) {
        console.error("AI evaluation failed:", error);
        return false;
      }
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
        conditionType: z.enum(["description", "amount", "date", "ai"]),
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
        categoryId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const ruleData = {
        ...input,
        conditionValue: input.conditionValue ?? "",
        conditionSubtype: input.conditionSubtype ?? "contains",
      };
      return db.insert(categorizationRules).values(ruleData);
    }),

  updateCategorizationRule: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        ruleId: z.string(),
        name: z.string().optional(),
        conditionType: z.enum(["description", "amount", "date", "ai"]).optional(),
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
        categoryId: z.string(),
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

  // Delete a categorization rule
  deleteCategorizationRule: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        ruleId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return db
        .delete(categorizationRules)
        .where(
          and(
            eq(categorizationRules.id, input.ruleId),
            eq(categorizationRules.userId, input.userId),
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