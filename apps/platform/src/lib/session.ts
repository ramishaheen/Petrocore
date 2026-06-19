import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Client } from "@prisma/client";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

/** Returns the current user's Client row, creating it on first access. */
export async function requireClient(): Promise<Client | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const existing = await prisma.client.findUnique({ where: { userId } });
  if (existing) return existing;

  return prisma.client.create({ data: { userId } });
}
