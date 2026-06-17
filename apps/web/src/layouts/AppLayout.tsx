import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { setLocale, type Locale } from "../i18n";
import { useAuth } from "../store/auth";

const NAV = [
  { to: "/dashboard", key: "dashboard" },
  { to: "/hierarchy", key: "hierarchy" },
  { to: "/competencies", key: "competencies" },
  { to: "/gaps", key: "gaps" },
  { to: "/reports", key: "reports" },
  { to: "/governance", key: "governance" },
  { to: "/enablement", key: "enablement" },
  { to: "/diagnostic", key: "diagnostic" },
];

export default function AppLayout() {
  const { t, i18n } = useTranslation();
  const { roleAr, role, logout } = useAuth();
  const navigate = useNavigate();

  const toggleLang = () =>
    setLocale((i18n.language === "ar" ? "en" : "ar") as Locale);

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-petro-dark text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <div className="text-lg font-bold">{t("app.name")}</div>
          <div className="text-xs text-white/60 mt-1">{t("app.tagline")}</div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition ${
                  isActive ? "bg-petro-light text-white" : "text-white/80 hover:bg-white/10"
                }`
              }
            >
              {t(`nav.${item.key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 text-xs space-y-2">
          <div className="text-white/60">{i18n.language === "ar" ? roleAr : role}</div>
          <button onClick={toggleLang} className="w-full py-1.5 rounded bg-white/10 hover:bg-white/20">
            {t("common.language")}
          </button>
          <button
            onClick={() => { logout(); navigate("/login"); }}
            className="w-full py-1.5 rounded bg-petro-gold/80 hover:bg-petro-gold text-petro-dark font-medium"
          >
            {t("nav.logout")}
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
