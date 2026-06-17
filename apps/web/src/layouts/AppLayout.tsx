import {
  Activity, BarChart3, BookOpen, Boxes, ClipboardCheck, GraduationCap,
  LayoutDashboard, LogOut, Network, Rocket, ScrollText, ShieldCheck, Globe, type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { setLocale, type Locale } from "../i18n";
import { useAuth } from "../store/auth";

interface NavItem { to: string; key: string; icon: LucideIcon; }
interface NavGroup { groupKey: string; items: NavItem[]; }

const GROUPS: NavGroup[] = [
  { groupKey: "overview", items: [{ to: "/dashboard", key: "dashboard", icon: LayoutDashboard }] },
  { groupKey: "foundation", items: [
    { to: "/hierarchy", key: "hierarchy", icon: Network },
    { to: "/competencies", key: "competencies", icon: BookOpen },
    { to: "/profiles", key: "profiles", icon: Boxes },
  ] },
  { groupKey: "intelligence", items: [
    { to: "/assessment", key: "assessment", icon: ClipboardCheck },
    { to: "/gaps", key: "gaps", icon: Activity },
  ] },
  { groupKey: "decision", items: [
    { to: "/training", key: "training", icon: GraduationCap },
    { to: "/reports", key: "reports", icon: BarChart3 },
    { to: "/governance", key: "governance", icon: ShieldCheck },
  ] },
  { groupKey: "rollout", items: [
    { to: "/enablement", key: "enablement", icon: Rocket },
    { to: "/diagnostic", key: "diagnostic", icon: ScrollText },
  ] },
];

const ALL = GROUPS.flatMap((g) => g.items);

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const { roleAr, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ar = i18n.language === "ar";

  const toggleLang = () => setLocale((ar ? "en" : "ar") as Locale);
  const current = ALL.find((n) => location.pathname.startsWith(n.to));

  return (
    <div className="min-h-screen flex bg-petro-mesh">
      <a href="#main" className="skip-link">{t("common.skipToContent")}</a>

      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-petro-grad text-white flex flex-col">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-white/15 font-bold">360°</span>
          <div>
            <div className="text-sm font-bold leading-tight">{t("app.name")}</div>
            <div className="text-[10px] text-white/55">{t("app.tagline")}</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label={t("nav.primary")}>
          {GROUPS.map((g) => (
            <div key={g.groupKey}>
              <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-white/40">
                {t(`navGroup.${g.groupKey}`)}
              </div>
              <div className="space-y-0.5">
                {g.items.map(({ to, key, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `group flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                        isActive
                          ? "bg-white/15 text-white shadow-soft font-medium"
                          : "text-white/70 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={17} className="shrink-0" />
                    <span className="truncate">{t(`nav.${key}`)}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button onClick={toggleLang} className="btn-ghost w-full mb-2">
            <Globe size={15} /> {t("common.language")}
          </button>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="btn w-full bg-petro-gold/90 hover:bg-petro-gold text-petro-dark font-medium"
          >
            <LogOut size={15} /> {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-8 flex items-center justify-between bg-white/70 backdrop-blur border-b border-slate-200/70 sticky top-0 z-10">
          <nav className="text-sm text-ink-soft" aria-label="Breadcrumb">
            <span className="text-ink-muted">{t("app.name")}</span>
            {current && <span className="mx-2 text-ink-muted">/</span>}
            {current && <span className="font-medium text-ink">{t(`nav.${current.key}`)}</span>}
          </nav>
          <div className="flex items-center gap-3">
            <span className="chip bg-petro/10 text-petro">{ar ? roleAr : role}</span>
            <span className="grid place-items-center w-8 h-8 rounded-full bg-petro-grad text-white text-xs font-bold">
              {((ar ? roleAr : role) || "?").slice(0, 1)}
            </span>
          </div>
        </header>

        <main id="main" className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
