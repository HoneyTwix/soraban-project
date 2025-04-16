import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { transactionReviews } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";

const reviewSchema = z.object({
  transactionId: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  notes: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const conditions = [eq(transactionReviews.userId, user.id)];
    if (status) {
      conditions.push(eq(transactionReviews.status, status));
    }

    const result = await db.query.transactionReviews.findMany({
      where: and(...conditions),
      with: {
        transaction: true,
      },
      orderBy: (reviews) => reviews.createdAt,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as unknown;
    const validatedData = reviewSchema.parse(body);

    const result = await db.insert(transactionReviews).values({
      ...validatedData,
      userId: user.id,
      reviewedAt: new Date(),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 },
    );
  }
} 