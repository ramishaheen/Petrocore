import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

import MethodInfo from "./MethodInfo";
import { methodModuleForPath } from "../lib/methodMap";

/* ------------------------------------------------------------------ Card */
export function Card({ children, className = "", hover = false }: {
  children: ReactNode; className?: string; hover?: boolean;
}) {
  return <div className={`card ${hover ? "card-hover" : ""} ${className}`}>{children}</div>;
}

/* ------------------------------------------------------------ PageHeader */
export function PageHeader({ title, subtitle, icon: Icon, actions, methodModule }: {
  title: string; subtitle?: string; icon?: LucideIcon; actions?: ReactNode; methodModule?: string;
}) {
  const { pathname } = useLocation();
  const mod = methodModule ?? methodModuleForPath(pathname);
  return (
    <div className="flex items-start justify-between gap-4 animate-slide-up">
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="grid place-items-center w-11 h-11 rounded-2xl bg-petro/10 text-petro shrink-0">
            <Icon size={22} strokeWidth={2} />
          </span>
        )}
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
            {mod && <MethodInfo module={mod} />}
          </div>
          {subtitle && <p className="text-sm text-ink-soft mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ----------------------------------------------------------------- Badge */
type Tone = "green" | "amber" | "red" | "blue" | "slate" | "gold";
const TONES: Record<Tone, string> = {
  green: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  blue: "bg-blue-100 text-blue-700",
  slate: "bg-slate-100 text-slate-600",
  gold: "bg-[#f7eccb] text-[#8a6d12]",
};
export function Badge({ children, tone = "slate", icon: Icon }: {
  children: ReactNode; tone?: Tone; icon?: LucideIcon;
}) {
  return (
    <span className={`chip ${TONES[tone]}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------- StatCard */
export function StatCard({ label, value, suffix, icon: Icon, tone = "green", hint }: {
  label: string; value: ReactNode; suffix?: string; icon?: LucideIcon; tone?: Tone; hint?: string;
}) {
  return (
    <Card hover className="animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-ink-soft">{label}</div>
          <div className="mt-1 text-3xl font-bold text-ink tabular-nums">
            {value}
            {suffix && <span className="text-lg text-ink-muted ms-1">{suffix}</span>}
          </div>
          {hint && <div className="text-xs text-ink-muted mt-1">{hint}</div>}
        </div>
        {Icon && (
          <span className={`grid place-items-center w-10 h-10 rounded-xl ${TONES[tone]}`}>
            <Icon size={20} />
          </span>
        )}
      </div>
    </Card>
  );
}

/* ----------------------------------------------------------- ProgressRing */
export function ProgressRing({ value, size = 132, label }: {
  value: number; size?: number; label?: string;
}) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const tone = pct >= 75 ? "#1f8a6e" : pct >= 50 ? "#c9a227" : "#ef4444";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={9} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth={9}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-bold text-ink tabular-nums">{Math.round(pct)}</div>
        {label && <div className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</div>}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- Skeleton */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}

/* ------------------------------------------------------------ EmptyState */
export function EmptyState({ icon: Icon, title, hint }: {
  icon?: LucideIcon; title: string; hint?: string;
}) {
  return (
    <div className="text-center py-10 text-ink-muted">
      {Icon && <Icon size={32} className="mx-auto mb-2 opacity-50" />}
      <div className="text-sm font-medium text-ink-soft">{title}</div>
      {hint && <div className="text-xs mt-1">{hint}</div>}
    </div>
  );
}
