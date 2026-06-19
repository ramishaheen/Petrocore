import {
  Activity, BarChart3, BookOpen, Boxes, Building2, ClipboardCheck, Crown, FileStack, Gauge,
  GraduationCap, LayoutDashboard, LogOut, Moon, Network, Rocket, ScrollText, ShieldCheck,
  Globe, Sun, UserCircle, Users, type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import PersonaSwitcher from "../components/PersonaSwitcher";
import { setLocale, type Locale } from "../i18n";
import { DEMO } from "../lib/demo";
import { navForRole } from "../lib/roles";
import { getTheme, toggleTheme } from "../lib/theme";
import { useAuth } from "../store/auth";

const ICONS: Record<string, LucideIcon> = {
  myWorkspace: UserCircle, myTeam: Users, department: Building2,
  dashboard: LayoutDashboard, hierarchy: Network, competencies: BookOpen, profiles: Boxes,
  assessment: ClipboardCheck, blueprints: FileStack, readiness: Gauge,
  gaps: Activity, training: GraduationCap, succession: Crown, reports: BarChart3,
  governance: ShieldCheck, enablement: Rocket, diagnostic: ScrollText,
};
const GROUP_ORDER = ["me", "overview", "foundation", "intelligence", "decision", "rollout"];

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const { roleAr, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const ar = i18n.language === "ar";
  const [dark, setDark] = useState(getTheme() === "dark");

  const items = navForRole(role);
  const groups = GROUP_ORDER
    .map((g) => ({ group: g, items: items.filter((n) => n.group === g) }))
    .filter((g) => g.items.length > 0);
  const current = items.find((n) => location.pathname.startsWith(n.route));

  return (
    <div className="min-h-screen flex bg-petro-mesh">
      <a href="#main" className="skip-link">{t("common.skipToContent")}</a>

      <aside className="w-64 shrink-0 bg-petro-grad text-white flex flex-col">
        <div className="px-5 py-5 flex items-center gap-3 border-b border-white/10">
          <span className="grid place-items-center w-10 h-10 rounded-xl bg-white/15 font-bold">360°</span>
          <div>
            <div className="text-sm font-bold leading-tight">{t("app.name")}</div>
            <div className="text-[10px] text-white/55">{t("app.tagline")}</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label={t("nav.primary")}>
          {groups.map((g) => (
            <div key={g.group}>
              <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-white/40">
                {t(`navGroup.${g.group}`)}
              </div>
              <div className="space-y-0.5">
                {g.items.map((item) => {
                  const Icon = ICONS[item.key] ?? LayoutDashboard;
                  return (
                    <NavLink
                      key={item.route}
                      to={item.route}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all ${
                          isActive
                            ? "bg-white/15 text-white shadow-soft font-medium"
                            : "text-white/70 hover:bg-white/10 hover:text-white"
                        }`
                      }
                    >
                      <Icon size={17} className="shrink-0" />
                      <span className="truncate">{t(`nav.${item.key}`)}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="flex gap-2 mb-2">
            <button onClick={() => setLocale((ar ? "en" : "ar") as Locale)} className="btn-ghost flex-1">
              <Globe size={15} /> {t("common.language")}
            </button>
            <button
              onClick={() => setDark(toggleTheme() === "dark")}
              className="btn-ghost px-3" aria-label={t("common.theme")} title={t("common.theme")}
            >
              {dark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="btn w-full bg-petro-gold/90 hover:bg-petro-gold text-petro-dark font-medium"
          >
            <LogOut size={15} /> {t("nav.logout")}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 px-8 flex items-center justify-between bg-white/70 backdrop-blur border-b border-slate-200/70 sticky top-0 z-10">
          <nav className="text-sm text-ink-soft" aria-label="Breadcrumb">
            <span className="text-ink-muted">{t("app.name")}</span>
            {current && <span className="mx-2 text-ink-muted">/</span>}
            {current && <span className="font-medium text-ink">{t(`nav.${current.key}`)}</span>}
          </nav>
          <div className="flex items-center gap-3">
            {DEMO ? <PersonaSwitcher /> : <span className="chip bg-petro/10 text-petro">{ar ? roleAr : role}</span>}
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
