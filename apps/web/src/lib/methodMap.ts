/**
 * Maps a route path to the `method.modules.*` i18n key that explains it.
 * Used by PageHeader to show the "how it works" info icon on every tab.
 */
const MAP: Record<string, string> = {
  "/my-workspace": "workspace",
  "/my-team": "team",
  "/department": "dept",
  "/dashboard": "dashboard",
  "/hierarchy": "hierarchy",
  "/profiles": "profiles",
  "/competencies": "competencies",
  "/assessment": "assessment",
  "/blueprints": "blueprint",
  "/readiness": "readiness",
  "/gaps": "gaps",
  "/succession": "succession",
  "/training": "training",
  "/strategy": "strategy",
  "/operations": "ops",
  "/campaigns": "campaigns",
  "/development": "devplan",
  "/workflows": "workflows",
  "/ai-studio": "aistudio",
  "/groups": "groups",
  "/workforce-planning": "wfp",
  "/knowledge-graph": "graph",
  "/integrations": "integrations",
  "/reports": "value",
  "/governance": "governance",
  "/enablement": "enablement",
  "/diagnostic": "diagnostic",
  "/settings": "settings",
};

export function methodModuleForPath(pathname: string): string | undefined {
  if (MAP[pathname]) return MAP[pathname];
  // Detail routes share their parent's explainer.
  if (pathname.startsWith("/profiles/")) return "profiles";
  if (pathname.startsWith("/competencies/")) return "competencies";
  return undefined;
}
