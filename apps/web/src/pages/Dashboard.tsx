import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, LayoutDashboard, ShieldCheck, Target, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, PolarAngleAxis, PolarGrid,
  Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { Badge, Card, PageHeader, PageSkeleton, ProgressRing, StatCard } from "../components/ui";
import { api } from "../lib/api";

interface Company { id: string; name_en: string; name_ar: string; readiness?: number; }
interface ExecData {
  workforce_readiness_index: number; profiles: number; critical_jobs_total: number;
  high_risk_critical_jobs: number; high_risk_pct: number; profiles_trusted?: number;
  top_competency_gaps: { competency_id: string; count: number }[];
  companies: Company[]; modules: string[];
  readiness_trend?: { m: string; v: number }[];
  family_radar?: { en: string; ar: string; score: number }[];
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const { data, isLoading } = useQuery<ExecData>({
    queryKey: ["executive"], queryFn: async () => (await api.get("/dashboards/executive")).data,
  });
  if (isLoading || !data) return <PageSkeleton />;

  const gapData = data.top_competency_gaps.map((g, i) => ({ name: `#${i + 1}`, count: g.count }));
  const barColors = ["#0d5c4a", "#1f8a6e", "#3aa589", "#62bda6", "#8fd3c2"];
  const companies = data.companies.filter((c) => typeof c.readiness === "number");
  const groupAvg = companies.length ? Math.round(companies.reduce((s, c) => s + (c.readiness || 0), 0) / companies.length) : 0;
  const radar = (data.family_radar ?? []).map((f) => ({ name: ar ? f.ar : f.en, value: f.score }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.dashboard")} subtitle={t("app.subtitle")} icon={LayoutDashboard} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 flex flex-col items-center justify-center bg-petro-grad text-white border-0 animate-slide-up">
          <div className="text-sm text-white/80 mb-3">{t("dashboard.readinessIndex")}</div>
          <div className="bg-white rounded-full p-3 shadow-lift"><ProgressRing value={data.workforce_readiness_index} label={t("common.readiness")} /></div>
          <div className="mt-3 text-xs text-white/60">/ 100</div>
        </Card>
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard label={t("dashboard.profiles")} value={data.profiles} icon={Users} tone="blue" />
          <StatCard label={t("profiles.status_TRUSTED")} value={data.profiles_trusted ?? "—"} icon={ShieldCheck} tone="green" />
          <StatCard label={t("dashboard.criticalJobs")} value={data.critical_jobs_total} icon={Target} tone="gold" />
          <StatCard label={t("dashboard.highRisk")} value={data.high_risk_critical_jobs} suffix={`(${data.high_risk_pct}%)`} icon={AlertTriangle} tone="red" />
          {data.readiness_trend && (
            <Card className="col-span-2 sm:col-span-4 animate-slide-up">
              <div className="text-sm font-semibold text-ink mb-1">{t("dashboard.trend")}</div>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={data.readiness_trend} margin={{ top: 6, right: 6, bottom: 0, left: -24 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1f8a6e" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#1f8a6e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f1" />
                  <XAxis dataKey="m" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[40, 100]} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="v" stroke="#0d5c4a" strokeWidth={2} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {companies.length > 0 && (
          <Card className="lg:col-span-2 animate-slide-up">
            <div className="font-semibold text-ink mb-3">{t("dashboard.companyComparison")}</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={companies.map((c) => ({ name: ar ? c.name_ar : c.name_en, readiness: c.readiness }))} margin={{ left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f1" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f1f5f4" }} />
                <ReferenceLine y={groupAvg} stroke="#c9a227" strokeDasharray="4 4" label={{ value: `${t("dashboard.groupAvg")} ${groupAvg}`, fontSize: 10, fill: "#8a6d12", position: "insideTopRight" }} />
                <Bar dataKey="readiness" radius={[6, 6, 0, 0]} barSize={42}>
                  {companies.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}
        {radar.length > 0 && (
          <Card className="animate-slide-up">
            <div className="font-semibold text-ink mb-2 flex items-center gap-2"><Building2 size={16} className="text-petro" /> {t("dashboard.familyRadar")}</div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10, fill: "#475569" }} />
                <Radar dataKey="value" stroke="#0d5c4a" fill="#1f8a6e" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="animate-slide-up">
          <div className="text-sm font-semibold text-ink mb-1">{t("dashboard.topGaps")}</div>
          {gapData.length === 0 ? <div className="text-xs text-ink-muted py-6 text-center">—</div> : (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={gapData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f1" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#f1f5f4" }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>{gapData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card className="lg:col-span-2 animate-slide-up">
          <div className="font-semibold text-ink mb-3">{t("dashboard.modules")}</div>
          <div className="flex flex-wrap gap-2">{data.modules.map((m) => <Badge key={m} tone="green">{m}</Badge>)}</div>
        </Card>
      </div>
    </div>
  );
}
