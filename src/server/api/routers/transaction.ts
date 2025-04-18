import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { transactions, transactionCategories, categories } from "~/server/db/schema";
import { eq, and, or, gte, lte, isNull, desc } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";

type Transaction = InferSelectModel<typeof transactions>;
type TransactionCategory = InferSelectModel<typeof transactionCategories>;
type Category = InferSelectModel<typeof categories>;

type TransactionWithCategories = Transaction & {
  transactionCategories: (TransactionCategory & {
    category: Category;
  })[];
};

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
      if (input.isFlagged !== undefined) {
        conditions.push(eq(transactions.isFlagged, input.isFlagged));
      }

      const results = await db.query.transactions.findMany({
        where: and(...conditions),
        orderBy: desc(transactions.date),
        with: {
          transactionCategories: {
            with: {
              category: true
            }
          }
        }
      }) as TransactionWithCategories[];

      // Transform the results to match our expected type
      const transformedResults = results.map(transaction => ({
        ...transaction,
        categories: transaction.transactionCategories.map(tc => ({
          id: tc.category.id,
          name: tc.category.name
        }))
      }));

      // If category filter is provided, filter results
      if (input.categoryId) {
        return transformedResults.filter(transaction => 
          transaction.categories.some(category => category.id === input.categoryId)
        );
      }

      return transformedResults;
    }),

  // Create a new transaction
  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        amount: z.number(),
        description: z.string(),
        date: z.date(),
        categoryIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { categoryIds, ...transactionData } = input;
      
      // Create transaction
      const [transaction] = await db.insert(transactions).values({
        ...transactionData,
        amount: input.amount.toString(),
        isFlagged: false,
        flags: [],
      }).returning();

      // Add categories if provided
      if (categoryIds && categoryIds.length > 0) {
        await db.insert(transactionCategories).values(
          categoryIds.map(categoryId => ({
            transactionId: transaction!.id,
            categoryId: categoryId,
            addedBy: "user",
          }))
        );
      }

      return transaction;
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
            categoryIds: z.array(z.string()).optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const transactionValues = input.transactions.map((t) => ({
        ...t,
        userId: input.userId,
        amount: t.amount.toString(),
        isFlagged: false,
        flags: [],
      }));

      // Insert transactions
      const insertedTransactions = await db.insert(transactions).values(transactionValues).returning();

      // Add categories if provided
      const categoryInserts = insertedTransactions.flatMap(transaction => {
        const originalTransaction = input.transactions.find(t => 
          t.amount.toString() === transaction.amount && 
          t.description === transaction.description &&
          t.date.getTime() === transaction.date.getTime()
        );
        
        if (originalTransaction?.categoryIds) {
          return originalTransaction.categoryIds.map(categoryId => ({
            transactionId: transaction.id,
            categoryId: categoryId,
            addedBy: "user",
          }));
        }
        return [];
      });

      if (categoryInserts.length > 0) {
        await db.insert(transactionCategories).values(categoryInserts);
      }

      return insertedTransactions;
    }),

  // Update transaction categories
  updateCategories: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        transactionId: z.string(),
        categoryIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      // Delete existing categories
      await db
        .delete(transactionCategories)
        .where(
          and(
            eq(transactionCategories.transactionId, input.transactionId),
          ),
        );

      // Add new categories
      if (input.categoryIds.length > 0) {
        await db.insert(transactionCategories).values(
          input.categoryIds.map(categoryId => ({
            transactionId: input.transactionId,
            categoryId,
            addedBy: "user",
          }))
        );
      }

      return true;
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
            // Check if transaction has no categories
            isNull(db.select().from(transactionCategories).where(eq(transactionCategories.transactionId, transactions.id))),
          ),
        ),
      });
    }),

  // Flag a transaction
  flag: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        transactionId: z.string(),
        flag: z.enum(["incomplete", "duplicate", "unusual_amount", "uncategorized"]),
      }),
    )
    .mutation(async ({ input }) => {
      const transaction = await db.query.transactions.findFirst({
        where: and(
          eq(transactions.userId, input.userId),
          eq(transactions.id, input.transactionId),
        ),
      });

      if (!transaction) {
        throw new Error("Transaction not found");
      }

      const currentFlags = transaction.flags ?? [];
      const newFlags = [...new Set([...currentFlags, input.flag])];

      return db
        .update(transactions)
        .set({
          isFlagged: newFlags.length > 0,
          flags: newFlags,
        })
        .where(
          and(
            eq(transactions.userId, input.userId),
            eq(transactions.id, input.transactionId),
          ),
        );
    }),

  // Delete a transaction
  delete: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        transactionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      // First delete all transaction-category relationships
      await db
        .delete(transactionCategories)
        .where(
          and(
            eq(transactionCategories.transactionId, input.transactionId),
          ),
        );

      // Then delete the transaction
      return db
        .delete(transactions)
        .where(
          and(
            eq(transactions.id, input.transactionId),
            eq(transactions.userId, input.userId),
          ),
        );
    }),

  // Update a transaction
  update: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        transactionId: z.string(),
        amount: z.string().optional(),
        description: z.string().optional(),
        date: z.date().optional(),
        categoryIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { transactionId, userId, categoryIds, ...updateData } = input;

      // Update transaction
      await db
        .update(transactions)
        .set(updateData)
        .where(
          and(
            eq(transactions.id, transactionId),
            eq(transactions.userId, userId),
          ),
        );

      // Update categories if provided
      if (categoryIds) {
        // Delete existing categories
        await db
          .delete(transactionCategories)
          .where(
            and(
              eq(transactionCategories.transactionId, transactionId),
            ),
          );

        // Add new categories
        if (categoryIds.length > 0) {
          await db.insert(transactionCategories).values(
            categoryIds.map(categoryId => ({
              transactionId,
              categoryId,
              addedBy: "user",
            }))
          );
        }
      }

      return true;
    }),

  // Approve a flagged transaction
  approve: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        transactionId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      return db
        .update(transactions)
        .set({
          isFlagged: false,
          flags: [],
        })
        .where(
          and(
            eq(transactions.id, input.transactionId),
            eq(transactions.userId, input.userId),
          ),
        );
    }),

  getByCategory: publicProcedure
    .input(z.object({ categoryId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.query.transactions.findMany({
        where: (transactions, { eq }) => 
          eq(transactions.id, ctx.db.select({ id: transactionCategories.transactionId })
            .from(transactionCategories)
            .where(eq(transactionCategories.categoryId, input.categoryId))
          ),
        orderBy: (transactions, { desc }) => [desc(transactions.date)],
      });
    }),
}); 