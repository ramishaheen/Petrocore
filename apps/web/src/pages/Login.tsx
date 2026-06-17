import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { setLocale, type Locale } from "../i18n";
import { useAuth } from "../store/auth";

export default function Login() {
  const { t, i18n } = useTranslation();
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@petrocore.ly");
  const [password, setPassword] = useState("petrocore123");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch {
      setError(t("login.error"));
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-petro-dark p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-petro">{t("app.name")}</div>
          <div className="text-xs text-slate-500 mt-1">{t("app.subtitle")}</div>
        </div>
        <div>
          <label className="block text-sm mb-1">{t("login.email")}</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">{t("login.password")}</label>
          <input
            type="password"
            className="w-full border rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button className="w-full bg-petro text-white rounded-lg py-2 font-medium hover:bg-petro-light">
          {t("login.submit")}
        </button>
        <button
          type="button"
          onClick={() => setLocale((i18n.language === "ar" ? "en" : "ar") as Locale)}
          className="w-full text-xs text-slate-500"
        >
          {t("common.language")}
        </button>
      </form>
    </div>
  );
}
