import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { categories } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";

const categorySchema = z.object({
  name: z.string(),
  description: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await db.query.categories.findMany({
      where: eq(categories.userId, user.id),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
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
    const validatedData = categorySchema.parse(body);

    const result = await db.insert(categories).values({
      ...validatedData,
      userId: user.id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 },
    );
  }
} 