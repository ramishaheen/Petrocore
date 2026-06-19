import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ar from "./ar.json";
import en from "./en.json";

export const SUPPORTED = ["ar", "en"] as const;
export type Locale = (typeof SUPPORTED)[number];

const saved = (localStorage.getItem("locale") as Locale) || "ar";

i18n.use(initReactI18next).init({
  resources: { ar: { translation: ar }, en: { translation: en } },
  lng: saved,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function applyDir(locale: Locale) {
  const dir = locale === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = locale;
  document.documentElement.dir = dir;
}

applyDir(saved);

export function setLocale(locale: Locale) {
  localStorage.setItem("locale", locale);
  i18n.changeLanguage(locale);
  applyDir(locale);
}

export default i18n;
