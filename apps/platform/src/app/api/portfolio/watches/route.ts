import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";

// Fields safe to return in a list — note: serialNumber is intentionally omitted.
const listSelect = {
  id: true,
  brand: true,
  model: true,
  reference: true,
  year: true,
  purchasePrice: true,
  purchaseCurrency: true,
  condition: true,
  boxPapers: true,
  location: true,
  status: true,
  insuranceValue: true,
  createdAt: true,
} as const;

export async function GET() {
  const client = await requireClient();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const watches = await prisma.watch.findMany({
    where: { clientId: client.id },
    select: listSelect,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ watches });
}

const createSchema = z.object({
  brand: z.string().min(1).max(80),
  model: z.string().min(1).max(120),
  reference: z.string().max(80).optional(),
  serialNumber: z.string().max(80).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  purchasePrice: z.number().int().min(0).optional(),
  purchaseCurrency: z.string().length(3).optional(),
  condition: z.string().max(40).optional(),
  boxPapers: z.string().max(60).optional(),
  location: z.string().max(80).optional(),
  insuranceValue: z.number().int().min(0).optional(),
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

  const watch = await prisma.watch.create({
    data: { ...parsed.data, clientId: client.id },
    select: listSelect,
  });
  return NextResponse.json({ watch }, { status: 201 });
}
