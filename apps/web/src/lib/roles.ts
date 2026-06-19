// Role-based experience map: which navigation each role sees, where each role
// lands, and the demo personas for the in-preview role switcher.
export type Role =
  | "EMPLOYEE" | "LINE_MANAGER" | "HR_VALIDATOR" | "DEPT_MANAGER" | "LD_MANAGER"
  | "COMPANY_ADMIN" | "NOC_EXECUTIVE" | "PLATFORM_ADMIN" | "CONSULTANT";

export interface NavMeta { key: string; route: string; group: string; roles: Role[] | "*"; }

export const NAV: NavMeta[] = [
  { key: "myWorkspace", route: "/my-workspace", group: "me", roles: ["EMPLOYEE", "PLATFORM_ADMIN"] },
  { key: "myTeam", route: "/my-team", group: "me", roles: ["LINE_MANAGER", "PLATFORM_ADMIN"] },
  { key: "department", route: "/department", group: "me", roles: ["DEPT_MANAGER", "PLATFORM_ADMIN"] },
  { key: "dashboard", route: "/dashboard", group: "overview", roles: ["NOC_EXECUTIVE", "COMPANY_ADMIN", "PLATFORM_ADMIN"] },
  { key: "hierarchy", route: "/hierarchy", group: "foundation", roles: ["COMPANY_ADMIN", "NOC_EXECUTIVE", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "strategy", route: "/strategy", group: "foundation", roles: ["NOC_EXECUTIVE", "COMPANY_ADMIN", "DEPT_MANAGER", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "operations", route: "/operations", group: "foundation", roles: ["COMPANY_ADMIN", "DEPT_MANAGER", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "competencies", route: "/competencies", group: "foundation", roles: "*" },
  { key: "profiles", route: "/profiles", group: "foundation", roles: ["HR_VALIDATOR", "COMPANY_ADMIN", "PLATFORM_ADMIN"] },
  { key: "assessment", route: "/assessment", group: "intelligence", roles: ["EMPLOYEE", "LINE_MANAGER", "HR_VALIDATOR", "PLATFORM_ADMIN"] },
  { key: "blueprints", route: "/blueprints", group: "intelligence", roles: ["HR_VALIDATOR", "LD_MANAGER", "COMPANY_ADMIN", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "gaps", route: "/gaps", group: "intelligence", roles: ["LINE_MANAGER", "DEPT_MANAGER", "LD_MANAGER", "COMPANY_ADMIN", "PLATFORM_ADMIN"] },
  { key: "readiness", route: "/readiness", group: "intelligence", roles: ["LINE_MANAGER", "DEPT_MANAGER", "HR_VALIDATOR", "COMPANY_ADMIN", "NOC_EXECUTIVE", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "campaigns", route: "/campaigns", group: "intelligence", roles: ["HR_VALIDATOR", "LD_MANAGER", "DEPT_MANAGER", "COMPANY_ADMIN", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "training", route: "/training", group: "decision", roles: ["LD_MANAGER", "DEPT_MANAGER", "PLATFORM_ADMIN"] },
  { key: "succession", route: "/succession", group: "decision", roles: ["HR_VALIDATOR", "DEPT_MANAGER", "COMPANY_ADMIN", "NOC_EXECUTIVE", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "development", route: "/development", group: "decision", roles: ["LD_MANAGER", "DEPT_MANAGER", "HR_VALIDATOR", "COMPANY_ADMIN", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "groups", route: "/groups", group: "decision", roles: ["HR_VALIDATOR", "DEPT_MANAGER", "LD_MANAGER", "COMPANY_ADMIN", "NOC_EXECUTIVE", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "reports", route: "/reports", group: "decision", roles: ["DEPT_MANAGER", "LD_MANAGER", "COMPANY_ADMIN", "NOC_EXECUTIVE", "PLATFORM_ADMIN"] },
  { key: "workforcePlanning", route: "/workforce-planning", group: "decision", roles: ["DEPT_MANAGER", "COMPANY_ADMIN", "NOC_EXECUTIVE", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "knowledgeGraph", route: "/knowledge-graph", group: "rollout", roles: ["CONSULTANT", "COMPANY_ADMIN", "NOC_EXECUTIVE", "PLATFORM_ADMIN"] },
  { key: "integrations", route: "/integrations", group: "rollout", roles: ["PLATFORM_ADMIN", "COMPANY_ADMIN", "CONSULTANT"] },
  { key: "workflows", route: "/workflows", group: "rollout", roles: ["COMPANY_ADMIN", "HR_VALIDATOR", "DEPT_MANAGER", "NOC_EXECUTIVE", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "aiStudio", route: "/ai-studio", group: "rollout", roles: ["HR_VALIDATOR", "LD_MANAGER", "COMPANY_ADMIN", "NOC_EXECUTIVE", "CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "governance", route: "/governance", group: "decision", roles: ["HR_VALIDATOR", "DEPT_MANAGER", "COMPANY_ADMIN", "NOC_EXECUTIVE", "PLATFORM_ADMIN"] },
  { key: "enablement", route: "/enablement", group: "rollout", roles: ["CONSULTANT", "COMPANY_ADMIN", "PLATFORM_ADMIN"] },
  { key: "diagnostic", route: "/diagnostic", group: "rollout", roles: ["CONSULTANT", "PLATFORM_ADMIN"] },
  { key: "settings", route: "/settings", group: "rollout", roles: ["PLATFORM_ADMIN", "COMPANY_ADMIN"] },
];

export const HOME: Record<Role, string> = {
  EMPLOYEE: "/my-workspace",
  LINE_MANAGER: "/my-team",
  DEPT_MANAGER: "/department",
  LD_MANAGER: "/training",
  HR_VALIDATOR: "/profiles",
  COMPANY_ADMIN: "/dashboard",
  NOC_EXECUTIVE: "/dashboard",
  PLATFORM_ADMIN: "/dashboard",
  CONSULTANT: "/enablement",
};

export function navForRole(role: string | null): NavMeta[] {
  return NAV.filter((n) => n.roles === "*" || (role && (n.roles as Role[]).includes(role as Role)));
}

export function homeForRole(role: string | null): string {
  return (role && HOME[role as Role]) || "/dashboard";
}

// Demo personas — the in-preview role switcher cycles through these so a viewer
// can experience every level without separate logins.
export const PERSONAS: { role: Role; email: string; en: string; ar: string; tag: string }[] = [
  { role: "EMPLOYEE", email: "employee@noc.ly", en: "Employee", ar: "الموظف", tag: "Player" },
  { role: "LINE_MANAGER", email: "manager@noc.ly", en: "Line Manager", ar: "المدير المباشر", tag: "Team" },
  { role: "DEPT_MANAGER", email: "dept@noc.ly", en: "Department Manager", ar: "مدير الإدارة", tag: "Department" },
  { role: "LD_MANAGER", email: "ld@noc.ly", en: "L&D Manager", ar: "مدير التدريب", tag: "Training" },
  { role: "HR_VALIDATOR", email: "hr@noc.ly", en: "HR Validator", ar: "الموارد البشرية", tag: "HR" },
  { role: "NOC_EXECUTIVE", email: "exec@noc.ly", en: "NOC Executive", ar: "الإدارة العليا", tag: "Group" },
  { role: "PLATFORM_ADMIN", email: "admin@petrocore.ly", en: "Platform Admin", ar: "مسؤول المنصة", tag: "All" },
];

export const ROLE_AR: Record<string, string> = Object.fromEntries(PERSONAS.map((p) => [p.role, p.ar]));
