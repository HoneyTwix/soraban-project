import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { transactions } from "~/server/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";

const transactionSchema = z.object({
  amount: z.number(),
  description: z.string().optional(),
  date: z.string().transform((str) => new Date(str)),
  categoryId: z.string().optional(),
  source: z.enum(["manual", "csv"]).default("manual"),
});

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const categoryId = searchParams.get("categoryId");
    const isFlagged = searchParams.get("isFlagged");

    const conditions = [eq(transactions.userId, user.id)];

    if (startDate) {
      conditions.push(gte(transactions.date, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(transactions.date, new Date(endDate)));
    }
    if (categoryId) {
      conditions.push(eq(transactions.categoryId, categoryId));
    }
    if (isFlagged !== null) {
      conditions.push(eq(transactions.isFlagged, isFlagged === "true"));
    }

    const result = await db.query.transactions.findMany({
      where: and(...conditions),
      with: {
        category: true,
        reviews: true,
      },
      orderBy: (transactions) => transactions.date,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
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
    const validatedData = transactionSchema.parse(body);

    const result = await db.insert(transactions).values({
      ...validatedData,
      userId: user.id,
      amount: validatedData.amount.toString(),
      isFlagged: false,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}
