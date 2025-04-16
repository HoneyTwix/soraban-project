import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { transactionReviews } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

export const reviewRouter = createTRPCRouter({
  // Get all reviews for a user
  getAll: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      return db.query.transactionReviews.findMany({
        where: eq(transactionReviews.userId, input.userId),
        with: {
          transaction: {
            with: {
              category: true,
            },
          },
        },
        orderBy: (reviews) => reviews.createdAt,
      });
    }),

  // Create a new review
  create: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        transactionId: z.string(),
        status: z.enum(["pending", "approved", "rejected"]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return db.insert(transactionReviews).values({
        ...input,
        reviewedAt: new Date(),
      });
    }),

  // Update a review
  update: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        reviewId: z.string(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { reviewId, userId, ...data } = input;
      return db
        .update(transactionReviews)
        .set({
          ...data,
          reviewedAt: new Date(),
        })
        .where(
          and(
            eq(transactionReviews.id, reviewId),
            eq(transactionReviews.userId, userId),
          ),
        );
    }),

  // Get reviews by status
  getByStatus: publicProcedure
    .input(
      z.object({
        userId: z.string(),
        status: z.enum(["pending", "approved", "rejected"]),
      }),
    )
    .query(async ({ input }) => {
      return db.query.transactionReviews.findMany({
        where: and(
          eq(transactionReviews.userId, input.userId),
          eq(transactionReviews.status, input.status),
        ),
        with: {
          transaction: {
            with: {
              category: true,
            },
          },
        },
        orderBy: (reviews) => reviews.createdAt,
      });
    }),
}); 