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
      {/* ---------------------------------------------------- Brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 text-white overflow-hidden
                      bg-petro-aurora bg-[length:300%_300%] animate-gradient-pan">
        {/* Floating colour orbs */}
        <div className="orb w-96 h-96 bg-petro-light/40 -top-24 -left-24 animate-float-slow" />
        <div className="orb w-80 h-80 bg-petro-gold/25 bottom-0 right-0 animate-float" />
        <div className="orb w-72 h-72 bg-emerald-300/20 top-1/3 right-1/4 animate-float-slow"
             style={{ animationDelay: "2s" }} />
        {/* Fine mesh + grid texture */}
        <div className="absolute inset-0 bg-petro-mesh opacity-50" />
        <div className="absolute inset-0 opacity-[0.07]"
             style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "44px 44px" }} />

        <div className="relative flex items-center gap-3 animate-rise-in">
          <span className="relative grid place-items-center w-12 h-12 rounded-2xl bg-white/15 backdrop-blur font-bold text-lg ring-1 ring-white/20">
            {/* Rotating halo behind the 360° badge */}
            <span className="absolute -inset-3 rounded-full opacity-60 animate-spin-slow"
                  style={{ background: "conic-gradient(from 0deg, transparent, rgba(201,162,39,.55), transparent 60%)" }} />
            <span className="relative">360°</span>
          </span>
          <div>
            <div className="font-bold">{t("app.name")}</div>
            <div className="text-xs text-white/60">{t("app.subtitle")}</div>
          </div>
        </div>

        <div className="relative space-y-6">
          <h2 className="text-3xl font-bold leading-snug max-w-md animate-rise-in" style={{ animationDelay: ".1s" }}>
            {t("app.heroLine")}
          </h2>
          <ul className="space-y-3">
            {pillars.map((p, i) => (
              <li key={p} className="flex items-center gap-3 text-white/90 animate-rise-in"
                  style={{ animationDelay: `${0.25 + i * 0.12}s` }}>
                <span className="grid place-items-center w-7 h-7 rounded-lg bg-white/10 ring-1 ring-white/15">
                  <ShieldCheck size={16} className="text-petro-gold" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-white/50 animate-rise-in" style={{ animationDelay: ".6s" }}>
          {t("app.tagline")}
        </div>
      </div>

      {/* ---------------------------------------------------- Form panel */}
      <div className="relative grid place-items-center p-6 bg-petro-mesh overflow-hidden">
        {/* Drifting orbs echo the brand side on the light panel too */}
        <div className="orb w-72 h-72 bg-petro-light/15 -top-16 right-0 animate-float-slow" />
        <div className="orb w-64 h-64 bg-petro-gold/10 bottom-0 -left-10 animate-float" style={{ animationDelay: "1.5s" }} />

        <form onSubmit={submit}
              className="relative card w-full max-w-sm space-y-5 shadow-glow animate-rise-in overflow-hidden">
          {/* Sweeping sheen across the card */}
          <span className="pointer-events-none absolute top-0 -left-1/3 h-full w-1/3
                           bg-gradient-to-r from-transparent via-white/40 to-transparent animate-sheen" />

          <div className="lg:hidden text-center">
            <div className="text-2xl font-bold text-petro">{t("app.name")}</div>
          </div>
          <div className="animate-rise-in" style={{ animationDelay: ".05s" }}>
            <h1 className="text-xl font-bold text-ink">{t("login.title")}</h1>
            <p className="text-sm text-ink-soft mt-0.5">{t("app.subtitle")}</p>
          </div>

          <label className="block animate-rise-in" style={{ animationDelay: ".12s" }}>
            <span className="text-sm text-ink-soft">{t("login.email")}</span>
            <div className="mt-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 bg-white/70
                            focus-within:border-petro focus-within:ring-2 focus-within:ring-petro/15 transition-all">
              <Mail size={16} className="text-ink-muted" />
              <input
                className="w-full py-2.5 bg-transparent outline-none"
                value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username"
              />
            </div>
          </label>

          <label className="block animate-rise-in" style={{ animationDelay: ".19s" }}>
            <span className="text-sm text-ink-soft">{t("login.password")}</span>
            <div className="mt-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3 bg-white/70
                            focus-within:border-petro focus-within:ring-2 focus-within:ring-petro/15 transition-all">
              <Lock size={16} className="text-ink-muted" />
              <input
                type="password" className="w-full py-2.5 bg-transparent outline-none"
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
              />
            </div>
          </label>

          {error && <div className="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2 animate-fade-in">{error}</div>}

          <button className="btn-primary w-full hover:shadow-lift hover:-translate-y-0.5 transition-all animate-rise-in"
                  style={{ animationDelay: ".26s" }} disabled={busy}>
            {busy && <Loader2 size={16} className="animate-spin" />}
            {t("login.submit")}
          </button>

          <button
            type="button"
            onClick={() => setLocale((i18n.language === "ar" ? "en" : "ar") as Locale)}
            className="w-full text-xs text-ink-muted hover:text-petro flex items-center justify-center gap-1 transition-colors"
          >
            <Globe size={13} /> {t("common.language")}
          </button>
        </form>
      </div>
    </div>
  );
}
