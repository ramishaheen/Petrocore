import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, BarChart3, Building2, GraduationCap, ShieldCheck, ShieldX, Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton, StatCard } from "../components/ui";
import { api } from "../lib/api";

interface ValueDim { key: string; en: string; ar: string; score: number; }
interface ValueData { dimensions: ValueDim[]; value_index: number; }
interface Succession { critical_roles_total: number; roles_at_risk: number; ready_successors: number; overall_readiness: number; }
interface DeptReadiness { departments: { tenant_id: string; avg_readiness: number; employees: number }[]; }
interface TrainingImpact { programs_measured: number; avg_gap_closure_pct: number; }
interface GovAudit { audit_chain_intact: boolean; decisions: { id: string; kind: string; status: string; confidence: number }[]; }

function useGet<T>(key: string, url: string) {
  return useQuery<T>({ queryKey: [key], queryFn: async () => (await api.get(url)).data });
}

export default function Reports() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const value = useGet<ValueData>("value", "/reports/institutional-value");
  const succ = useGet<Succession>("succession", "/reports/succession");
  const dept = useGet<DeptReadiness>("deptReadiness", "/reports/department-readiness");
  const impact = useGet<TrainingImpact>("trainingImpact", "/reports/training-impact");
  const audit = useGet<GovAudit>("govAudit", "/reports/governance-audit");

  if (value.isLoading || !value.data || !succ.data) return <PageSkeleton />;

  const chartData = value.data.dimensions.map((d) => ({ name: ar ? d.ar : d.en, score: d.score }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.reports")} icon={BarChart3} />

      <Card className="animate-slide-up">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-ink">{t("reports.institutionalValue")}</div>
          <span className="text-2xl font-bold text-petro tabular-nums">{value.data.value_index}</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "#f1f5f4" }} />
            <Bar dataKey="score" fill="#0d5c4a" radius={[0, 6, 6, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label={t("reports.criticalRoles")} value={succ.data.critical_roles_total} icon={AlertTriangle} tone="gold" />
        <StatCard label={t("reports.atRisk")} value={succ.data.roles_at_risk} icon={AlertTriangle} tone="red" />
        <StatCard label={t("reports.readySuccessors")} value={succ.data.ready_successors} icon={Users} tone="green" />
        <StatCard label={t("common.readiness")} value={succ.data.overall_readiness} icon={Building2} tone="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="font-semibold text-ink mb-3 flex items-center gap-2"><Building2 size={16} className="text-petro" />{t("reports.departmentReadiness")}</div>
          {(dept.data?.departments ?? []).length === 0 ? <EmptyState title="—" /> : (
            <ul className="text-sm space-y-2">
              {dept.data!.departments.map((d) => (
                <li key={d.tenant_id} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-ink-muted bg-slate-50 rounded px-1.5 py-0.5">{d.tenant_id.slice(0, 8)}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-petro" style={{ width: `${d.avg_readiness}%` }} />
                  </div>
                  <span className="tabular-nums text-ink">{d.avg_readiness}</span>
                  <span className="text-ink-muted text-xs">· {d.employees}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="font-semibold text-ink mb-3 flex items-center gap-2"><GraduationCap size={16} className="text-petro" />{t("reports.trainingImpact")}</div>
          <div className="flex items-baseline gap-8">
            <div>
              <div className="text-4xl font-bold text-petro tabular-nums">{impact.data?.avg_gap_closure_pct ?? 0}%</div>
              <div className="text-xs text-ink-muted">{t("reports.gapClosure")}</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-ink-muted tabular-nums">{impact.data?.programs_measured ?? 0}</div>
              <div className="text-xs text-ink-muted">{t("reports.programsMeasured")}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold text-ink flex items-center gap-2"><ShieldCheck size={16} className="text-petro" />{t("reports.governanceAudit")}</div>
          <Badge tone={audit.data?.audit_chain_intact ? "green" : "red"} icon={audit.data?.audit_chain_intact ? ShieldCheck : ShieldX}>
            {audit.data?.audit_chain_intact ? t("reports.chainIntact") : t("reports.chainTampered")}
          </Badge>
        </div>
        {(audit.data?.decisions ?? []).length === 0 ? <EmptyState title={t("reports.noDecisions")} /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-muted border-b border-slate-100">
                <th className="py-1.5 text-start font-medium">{t("common.status")}</th>
                <th className="py-1.5 text-start font-medium">Kind</th>
                <th className="py-1.5 text-start font-medium">{t("common.confidence")}</th>
              </tr>
            </thead>
            <tbody>
              {audit.data!.decisions.slice(0, 8).map((d) => (
                <tr key={d.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-1.5"><Badge tone={d.status === "APPROVED" ? "green" : d.status === "REJECTED" ? "red" : "amber"}>{d.status}</Badge></td>
                  <td className="py-1.5 text-ink">{d.kind}</td>
                  <td className="py-1.5 tabular-nums">{Math.round(d.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
