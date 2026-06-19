import { ChevronDown, UserCog } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { homeForRole, PERSONAS } from "../lib/roles";
import { useAuth } from "../store/auth";

// Demo-only: flip between role personas to experience every level of the system.
export default function PersonaSwitcher() {
  const { i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const { role, setRole } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = PERSONAS.find((p) => p.role === role) ?? PERSONAS[PERSONAS.length - 1];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 chip bg-petro/10 text-petro hover:bg-petro/15 transition-colors"
        title="Switch persona (demo)"
      >
        <UserCog size={14} />
        <span className="hidden sm:inline">{ar ? current.ar : current.en}</span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="absolute end-0 mt-2 w-60 bg-white rounded-xl shadow-lift border border-slate-100 p-1.5 z-30 animate-slide-up">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-ink-muted">
            {ar ? "تبديل الدور (تجريبي)" : "Switch role (demo)"}
          </div>
          {PERSONAS.map((p) => (
            <button
              key={p.role}
              onClick={() => { setRole(p.role); setOpen(false); navigate(homeForRole(p.role)); }}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors ${
                p.role === role ? "bg-petro-50 text-petro font-medium" : "hover:bg-slate-50 text-ink"
              }`}
            >
              <span>{ar ? p.ar : p.en}</span>
              <span className="chip bg-slate-100 text-ink-muted text-[10px]">{p.tag}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
