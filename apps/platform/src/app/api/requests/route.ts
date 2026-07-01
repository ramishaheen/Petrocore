import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";

// A client's own sourcing requests / rare-piece mandates.
export async function GET() {
  const client = await requireClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requests = await prisma.request.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ requests });
}

const createSchema = z.object({
  kind: z.enum(["RECOMMENDATION", "EXACT_WATCH", "RARE_PIECE", "BEST_DEAL", "TRADE"]),
  brand: z.string().max(80).optional(),
  model: z.string().max(120).optional(),
  reference: z.string().max(80).optional(),
  budgetMin: z.number().int().min(0).optional(),
  budgetMax: z.number().int().min(0).optional(),
  conditionPref: z.string().max(40).optional(),
  boxPapersRequired: z.boolean().optional(),
  preferredYear: z.string().max(40).optional(),
  deliveryCountry: z.string().max(80).optional(),
  timeframe: z.string().max(40).optional(),
  notes: z.string().max(4000).optional(),
});

export async function POST(req: Request) {
  const client = await requireClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const created = await prisma.request.create({
    data: { ...parsed.data, clientId: client.id, status: "NEW" },
  });
  return NextResponse.json({ request: created }, { status: 201 });
}
