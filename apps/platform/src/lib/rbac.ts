import type { Role } from "@prisma/client";

// Staff roles (everything except a plain client).
export const STAFF_ROLES: Role[] = [
  "CONSULTANT",
  "SOURCING",
  "PORTFOLIO_MGR",
  "VERIFIER",
  "CONTENT",
  "SUPPORT",
  "FINANCE",
  "AUDITOR",
  "SUPER_ADMIN",
];

export function isStaff(role: Role | undefined | null): boolean {
  return !!role && STAFF_ROLES.includes(role);
}

export function canManageClients(role: Role | undefined | null): boolean {
  return role === "SUPER_ADMIN" || role === "CONSULTANT" || role === "SUPPORT";
}

export function isAdmin(role: Role | undefined | null): boolean {
  return role === "SUPER_ADMIN";
}
