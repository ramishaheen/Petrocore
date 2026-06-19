import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Public intake endpoint — receives a consultation brief from the marketing site.
// TODO(phase 7): rate-limit + bot protection (e.g. Upstash ratelimit / Turnstile).
const schema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  country: z.string().max(80).optional(),
  timezone: z.string().max(60).optional(),
  preferredTime: z.enum(["morning", "afternoon", "evening", "any"]).optional(),
  preferredChannel: z.enum(["email", "phone", "whatsapp"]).optional(),
  objective: z.string().max(120).optional(),
  brief: z.record(z.any()).optional(),
  consent: z.boolean(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }
  if (!parsed.data.consent) {
    return NextResponse.json({ error: "Consent is required" }, { status: 422 });
  }

  const consultation = await prisma.consultation.create({
    data: { ...parsed.data, email: parsed.data.email.toLowerCase() },
    select: { id: true, createdAt: true },
  });

  // TODO(phase 6): notify an advisor (email/WhatsApp) when configured.
  return NextResponse.json(
    { id: consultation.id, reference: "HP-" + consultation.id.slice(-6).toUpperCase() },
    { status: 201 },
  );
}
