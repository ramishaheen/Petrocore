import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

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

function Kpi({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <div className="card">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-bold text-petro mt-1">
        {value}
        {suffix && <span className="text-lg text-slate-400 ms-1">{suffix}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery<ExecData>({
    queryKey: ["executive"],
    queryFn: async () => (await api.get("/dashboards/executive")).data,
  });

  if (isLoading || !data) return <div>{t("common.loading")}</div>;

  const ready = data.workforce_readiness_index;
  const gauge = [
    { name: "ready", value: ready },
    { name: "rest", value: Math.max(0, 100 - ready) },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.dashboard")}</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card flex flex-col items-center">
          <div className="text-sm text-slate-500">{t("dashboard.readinessIndex")}</div>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={gauge} dataKey="value" innerRadius={45} outerRadius={60} startAngle={90} endAngle={-270}>
                <Cell fill="#0d5c4a" />
                <Cell fill="#e2e8f0" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="-mt-24 text-2xl font-bold text-petro">{ready}</div>
        </div>
        <Kpi label={t("dashboard.profiles")} value={data.profiles} />
        <Kpi label={t("dashboard.criticalJobs")} value={data.critical_jobs_total} />
        <Kpi label={t("dashboard.highRisk")} value={data.high_risk_critical_jobs} suffix={`(${data.high_risk_pct}%)`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-semibold mb-3">{t("dashboard.companies")}</div>
          <ul className="space-y-2 text-sm">
            {data.companies.map((c) => (
              <li key={c.id} className="flex justify-between border-b py-1">
                <span>{i18n.language === "ar" ? c.name_ar : c.name_en}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="font-semibold mb-3">{t("dashboard.modules")}</div>
          <div className="flex flex-wrap gap-2">
            {data.modules.map((m) => (
              <span key={m} className="text-xs bg-petro/10 text-petro px-2 py-1 rounded-full">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
