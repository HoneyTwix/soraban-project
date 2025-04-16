import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { transactions } from "~/server/db/schema";
import { eq, and, or, gte, lte, isNull } from "drizzle-orm";

export const transactionRouter = createTRPCRouter({
  // Get all transactions with optional filters
  getAll: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        categoryId: z.string().optional(),
        isFlagged: z.boolean().optional(),
      }),
    )
    .query(async ({ input }) => {
      const conditions = [eq(transactions.userId, input.userId)];
      
      if (input.startDate) {
        conditions.push(gte(transactions.date, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(transactions.date, input.endDate));
      }
      if (input.categoryId) {
        conditions.push(eq(transactions.categoryId, input.categoryId));
      }
      if (input.isFlagged !== undefined) {
        conditions.push(eq(transactions.isFlagged, input.isFlagged));
      }

      return db.query.transactions.findMany({
        where: and(...conditions),
        with: {
          category: true,
          reviews: true,
        },
        orderBy: (transactions) => transactions.date,
      });
    }),

  // Create a new transaction
  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number(),
        description: z.string(),
        date: z.date(),
        categoryId: z.string().optional(),
        source: z.enum(["manual", "csv"]).default("manual"),
      }),
    )
    .mutation(async ({ input }) => {
      return db.insert(transactions).values({
        ...input,
        amount: input.amount.toString(),
        isFlagged: false,
      });
    }),

  // Import transactions from CSV
  importFromCsv: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        transactions: z.array(
          z.object({
            amount: z.number(),
            description: z.string(),
            date: z.date(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const values = input.transactions.map((t) => ({
        ...t,
        userId: input.userId,
        source: "csv" as const,
        amount: t.amount.toString(),
        isFlagged: false,
      }));

      return db.insert(transactions).values(values);
    }),

  // Update transaction category
  updateCategory: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        transactionIds: z.array(z.string()),
        categoryId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return db
        .update(transactions)
        .set({ categoryId: input.categoryId })
        .where(
          and(
            eq(transactions.userId, input.userId),
            or(...input.transactionIds.map((id) => eq(transactions.id, id))),
          ),
        );
    }),

  // Get transactions needing review
  getNeedingReview: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return db.query.transactions.findMany({
        where: and(
          eq(transactions.userId, input.userId),
          or(
            eq(transactions.isFlagged, true),
            isNull(transactions.categoryId),
          ),
        ),
        with: {
          category: true,
          reviews: true,
        },
      });
    }),

  // Flag a transaction
  flag: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        transactionId: z.string(),
        reason: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return db
        .update(transactions)
        .set({
          isFlagged: true,
          flagReason: input.reason,
        })
        .where(
          and(
            eq(transactions.userId, input.userId),
            eq(transactions.id, input.transactionId),
          ),
        );
    }),
}); 