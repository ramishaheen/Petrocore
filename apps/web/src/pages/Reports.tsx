import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "../lib/api";

interface ValueDim { key: string; en: string; ar: string; score: number; }
interface ValueData { dimensions: ValueDim[]; value_index: number; }
interface Succession {
  critical_roles_total: number; roles_at_risk: number; ready_successors: number;
  overall_readiness: number;
}
interface DeptReadiness { departments: { tenant_id: string; avg_readiness: number; employees: number }[]; }
interface TrainingImpact { programs_measured: number; avg_gap_closure_pct: number; }
interface GovAudit {
  audit_chain_intact: boolean;
  decisions: { id: string; kind: string; status: string; confidence: number }[];
}

function useGet<T>(key: string, url: string) {
  return useQuery<T>({ queryKey: [key], queryFn: async () => (await api.get(url)).data });
}

export default function Reports() {
  const { t, i18n } = useTranslation();
  const value = useGet<ValueData>("value", "/reports/institutional-value");
  const succ = useGet<Succession>("succession", "/reports/succession");
  const dept = useGet<DeptReadiness>("deptReadiness", "/reports/department-readiness");
  const impact = useGet<TrainingImpact>("trainingImpact", "/reports/training-impact");
  const audit = useGet<GovAudit>("govAudit", "/reports/governance-audit");

  if (value.isLoading || !value.data || !succ.data) return <div>{t("common.loading")}</div>;

  const chartData = value.data.dimensions.map((d) => ({
    name: i18n.language === "ar" ? d.ar : d.en, score: d.score,
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
        <div className="card"><div className="text-sm text-slate-500">{t("reports.criticalRoles")}</div>
          <div className="text-3xl font-bold text-petro">{succ.data.critical_roles_total}</div></div>
        <div className="card"><div className="text-sm text-slate-500">{t("reports.atRisk")}</div>
          <div className="text-3xl font-bold text-red-600">{succ.data.roles_at_risk}</div></div>
        <div className="card"><div className="text-sm text-slate-500">{t("reports.readySuccessors")}</div>
          <div className="text-3xl font-bold text-emerald-600">{succ.data.ready_successors}</div></div>
        <div className="card"><div className="text-sm text-slate-500">{t("common.readiness")}</div>
          <div className="text-3xl font-bold text-petro">{succ.data.overall_readiness}</div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <div className="font-semibold mb-3">{t("reports.departmentReadiness")}</div>
          {(dept.data?.departments ?? []).length === 0 ? (
            <p className="text-xs text-slate-400">—</p>
          ) : (
            <ul className="text-sm space-y-1">
              {dept.data!.departments.map((d) => (
                <li key={d.tenant_id} className="flex justify-between border-b py-1">
                  <span className="font-mono text-xs">{d.tenant_id.slice(0, 8)}</span>
                  <span>{d.avg_readiness} · {d.employees} 👤</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="font-semibold mb-3">{t("reports.trainingImpact")}</div>
          <div className="flex items-baseline gap-4">
            <div>
              <div className="text-3xl font-bold text-petro">{impact.data?.avg_gap_closure_pct ?? 0}%</div>
              <div className="text-xs text-slate-500">{t("reports.gapClosure")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-400">{impact.data?.programs_measured ?? 0}</div>
              <div className="text-xs text-slate-500">{t("reports.programsMeasured")}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{t("reports.governanceAudit")}</div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            audit.data?.audit_chain_intact ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}>
            {audit.data?.audit_chain_intact ? t("reports.chainIntact") : t("reports.chainTampered")}
          </span>
        </div>
        {(audit.data?.decisions ?? []).length === 0 ? (
          <p className="text-xs text-slate-400">{t("reports.noDecisions")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-500 border-b">
              <th className="py-1 text-start">{t("common.status")}</th>
              <th className="py-1 text-start">Kind</th>
              <th className="py-1 text-start">{t("common.confidence")}</th>
            </tr></thead>
            <tbody>
              {audit.data!.decisions.slice(0, 8).map((d) => (
                <tr key={d.id} className="border-b last:border-0">
                  <td className="py-1">{d.status}</td>
                  <td className="py-1">{d.kind}</td>
                  <td className="py-1">{Math.round(d.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
