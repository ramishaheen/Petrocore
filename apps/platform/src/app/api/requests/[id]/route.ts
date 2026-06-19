import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

// Staff-only: advance / change a request's status and assignment.
const patchSchema = z.object({
  status: z
    .enum([
      "NEW", "QUALIFICATION", "CONSULTATION_SCHEDULED", "SEARCHING",
      "OPPORTUNITIES_IDENTIFIED", "CLIENT_REVIEW", "NEGOTIATION", "VERIFICATION",
      "PAYMENT", "SHIPPING", "COMPLETED", "PAUSED", "CLOSED",
    ])
    .optional(),
  assignedToId: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || !isStaff(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const updated = await prisma.request.update({
    where: { id: params.id },
    data: parsed.data,
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "request.update",
      entity: "Request",
      entityId: params.id,
      meta: parsed.data,
    },
  });

  return NextResponse.json({ request: updated });
}
