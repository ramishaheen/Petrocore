import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "../lib/api";

interface ValueDim {
  key: string;
  en: string;
  ar: string;
  score: number;
}
interface ValueData {
  dimensions: ValueDim[];
  value_index: number;
}
interface Succession {
  critical_roles_total: number;
  roles_at_risk: number;
  ready_successors: number;
  overall_readiness: number;
  pipeline: Record<string, number>;
}

export default function Reports() {
  const { t, i18n } = useTranslation();
  const value = useQuery<ValueData>({
    queryKey: ["value"],
    queryFn: async () => (await api.get("/reports/institutional-value")).data,
  });
  const succ = useQuery<Succession>({
    queryKey: ["succession"],
    queryFn: async () => (await api.get("/reports/succession")).data,
  });

  if (value.isLoading || succ.isLoading || !value.data || !succ.data)
    return <div>{t("common.loading")}</div>;

  const chartData = value.data.dimensions.map((d) => ({
    name: i18n.language === "ar" ? d.ar : d.en,
    score: d.score,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.reports")}</h1>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{t("reports.institutionalValue")}</div>
          <div className="text-2xl font-bold text-petro">{value.data.value_index}</div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="score" fill="#0d5c4a" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="text-sm text-slate-500">{t("reports.criticalRoles")}</div>
          <div className="text-3xl font-bold text-petro">{succ.data.critical_roles_total}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">{t("reports.atRisk")}</div>
          <div className="text-3xl font-bold text-red-600">{succ.data.roles_at_risk}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">{t("reports.readySuccessors")}</div>
          <div className="text-3xl font-bold text-emerald-600">{succ.data.ready_successors}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">{t("common.readiness")}</div>
          <div className="text-3xl font-bold text-petro">{succ.data.overall_readiness}</div>
        </div>
      </div>
    </div>
  );
}
