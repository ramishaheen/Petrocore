import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, LayoutDashboard, Target, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { Badge, Card, PageHeader, PageSkeleton, ProgressRing, StatCard } from "../components/ui";
import { api } from "../lib/api";

interface ExecData {
  workforce_readiness_index: number;
  profiles: number;
  critical_jobs_total: number;
  high_risk_critical_jobs: number;
  high_risk_pct: number;
  top_competency_gaps: { competency_id: string; count: number }[];
  companies: { id: string; name_en: string; name_ar: string }[];
  modules: string[];
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const { data, isLoading } = useQuery<ExecData>({
    queryKey: ["executive"],
    queryFn: async () => (await api.get("/dashboards/executive")).data,
  });

  if (isLoading || !data) return <PageSkeleton />;

  const gapData = data.top_competency_gaps.map((g, i) => ({
    name: `#${i + 1}`, count: g.count,
  }));
  const barColors = ["#0d5c4a", "#1f8a6e", "#3aa589", "#62bda6", "#8fd3c2"];

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.dashboard")} subtitle={t("app.subtitle")} icon={LayoutDashboard} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Hero readiness gauge */}
        <Card className="lg:col-span-1 flex flex-col items-center justify-center bg-petro-grad text-white border-0 animate-slide-up">
          <div className="text-sm text-white/80 mb-3">{t("dashboard.readinessIndex")}</div>
          <div className="bg-white rounded-full p-3 shadow-lift">
            <ProgressRing value={data.workforce_readiness_index} label={t("common.readiness")} />
          </div>
          <div className="mt-3 text-xs text-white/60">/ 100</div>
        </Card>

        {/* KPI cards */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label={t("dashboard.profiles")} value={data.profiles} icon={Users} tone="blue" />
          <StatCard label={t("dashboard.criticalJobs")} value={data.critical_jobs_total} icon={Target} tone="gold" />
          <StatCard
            label={t("dashboard.highRisk")} value={data.high_risk_critical_jobs}
            suffix={`(${data.high_risk_pct}%)`} icon={AlertTriangle} tone="red"
          />
          <StatCard
            label={t("dashboard.companies")} value={data.companies.length}
            icon={Building2} tone="green" hint={data.companies.map((c) => (ar ? c.name_ar : c.name_en)).join(" · ")}
          />
          <Card className="sm:col-span-2 animate-slide-up">
            <div className="text-sm font-semibold text-ink mb-1">{t("dashboard.topGaps")}</div>
            {gapData.length === 0 ? (
              <div className="text-xs text-ink-muted py-6 text-center">—</div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={gapData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f1" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f1f5f4" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {gapData.map((_, i) => <Cell key={i} fill={barColors[i % barColors.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>

      {/* Executive modules */}
      <Card className="animate-slide-up">
        <div className="font-semibold text-ink mb-3">{t("dashboard.modules")}</div>
        <div className="flex flex-wrap gap-2">
          {data.modules.map((m) => <Badge key={m} tone="green">{m}</Badge>)}
        </div>
      </Card>
    </div>
  );
}
