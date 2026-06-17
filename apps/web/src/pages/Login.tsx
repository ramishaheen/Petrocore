import { Globe, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { setLocale, type Locale } from "../i18n";
import { homeForRole } from "../lib/roles";
import { useAuth } from "../store/auth";

export default function Login() {
  const { t, i18n } = useTranslation();
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@petrocore.ly");
  const [password, setPassword] = useState("petrocore123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setBusy(true);
    try {
      await login(email, password);
      navigate(homeForRole(useAuth.getState().role));
    } catch {
      setError(t("login.error"));
    } finally {
      setBusy(false);
    }
  };

  const pillars = [t("app.pillarReadiness"), t("app.pillarEvidence"), t("app.pillarGovernance")];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-petro-grad text-white overflow-hidden">
        <div className="absolute inset-0 bg-petro-mesh opacity-60" />
        <div className="relative flex items-center gap-3">
          <span className="grid place-items-center w-12 h-12 rounded-2xl bg-white/15 font-bold text-lg">360°</span>
          <div>
            <div className="font-bold">{t("app.name")}</div>
            <div className="text-xs text-white/60">{t("app.subtitle")}</div>
          </div>
        </div>
        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold leading-snug max-w-md">{t("app.heroLine")}</h2>
          <ul className="space-y-3">
            {pillars.map((p) => (
              <li key={p} className="flex items-center gap-3 text-white/90">
                <ShieldCheck size={18} className="text-petro-gold" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative text-xs text-white/50">{t("app.tagline")}</div>
      </div>

      {/* Form panel */}
      <div className="grid place-items-center p-6 bg-petro-mesh">
        <form onSubmit={submit} className="card w-full max-w-sm space-y-5 animate-slide-up">
          <div className="lg:hidden text-center">
            <div className="text-2xl font-bold text-petro">{t("app.name")}</div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-ink">{t("login.title")}</h1>
            <p className="text-sm text-ink-soft mt-0.5">{t("app.subtitle")}</p>
          </div>

          <label className="block">
            <span className="text-sm text-ink-soft">{t("login.email")}</span>
            <div className="mt-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 focus-within:border-petro transition-colors">
              <Mail size={16} className="text-ink-muted" />
              <input
                className="w-full py-2.5 bg-transparent outline-none"
                value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm text-ink-soft">{t("login.password")}</span>
            <div className="mt-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 focus-within:border-petro transition-colors">
              <Lock size={16} className="text-ink-muted" />
              <input
                type="password" className="w-full py-2.5 bg-transparent outline-none"
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
              />
            </div>
          </label>

          {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{error}</div>}

          <button className="btn-primary w-full" disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {t("login.submit")}
          </button>

          <button
            type="button"
            onClick={() => setLocale((i18n.language === "ar" ? "en" : "ar") as Locale)}
            className="w-full text-xs text-ink-muted hover:text-petro flex items-center justify-center gap-1"
          >
            <Globe size={13} /> {t("common.language")}
          </button>
        </form>
      </div>
    </div>
  );
}
