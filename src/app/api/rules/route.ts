import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { categorizationRules, anomalyRules } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { currentUser } from "@clerk/nextjs/server";

const ruleSchema = z.object({
  categoryId: z.string(),
  condition: z.record(z.unknown()),
  priority: z.number().default(0),
  isActive: z.boolean().default(true),
});

const anomalyRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  condition: z.record(z.unknown()),
  severity: z.enum(["low", "medium", "high"]),
  isActive: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const user = await currentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") ?? "categorization";

    if (type === "categorization") {
      const result = await db.query.categorizationRules.findMany({
        where: eq(categorizationRules.userId, user.id),
        with: {
          category: true,
        },
        orderBy: (rules) => rules.priority,
      });
      return NextResponse.json(result);
    } else {
      const result = await db.query.anomalyRules.findMany({
        where: eq(anomalyRules.userId, user.id),
        orderBy: (rules) => rules.name,
      });
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error("Error fetching rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch rules" },
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
    const type = (body as { type?: string }).type ?? "categorization";

    if (type === "categorization") {
      const validatedData = ruleSchema.parse(body);
      const result = await db.insert(categorizationRules).values({
        ...validatedData,
        userId: user.id,
      });
      return NextResponse.json(result, { status: 201 });
    } else {
      const validatedData = anomalyRuleSchema.parse(body);
      const result = await db.insert(anomalyRules).values({
        ...validatedData,
        userId: user.id,
      });
      return NextResponse.json(result, { status: 201 });
    }
  } catch (error) {
    console.error("Error creating rule:", error);
    return NextResponse.json(
      { error: "Failed to create rule" },
      { status: 500 },
    );
  }
}
