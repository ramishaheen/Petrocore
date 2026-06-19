import { useQuery } from "@tanstack/react-query";
import { Building2, GraduationCap, ShieldAlert, Target, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge, Card, PageHeader, PageSkeleton, StatCard } from "../components/ui";
import { api } from "../lib/api";

interface Overview {
  total_employees: number; ready_employees: number; ready_pct: number;
  critical_roles: number; critical_roles_covered: number; critical_roles_at_risk: number;
  open_training_needs: number; knowledge_holders: number; knowledge_at_risk: number;
}
interface SupplyRow { family: string; roles: number; headcount: number; ready: number; ready_pct: number; }
interface CoverageRow { job_id: string; title_en: string; title_ar: string; criticality: string; loss_risk: number; bench_strength: number; ready_now: number; coverage: string; }
interface DemandRow { competency_id: string; competency_en: string; competency_ar: string; learners: number; total_gap: number; very_high: number; }
interface Forecast { assessed_employees: number; current_ready: number; projected_ready: number; projected_uplift: number; open_gaps: number; horizon_months: number; }
interface Company { company_id: string; name_en: string; name_ar: string; avg_readiness: number; ready_pct: number; assessed: number; headcount: number; rank: number; }

const CRIT: Record<string, "red" | "amber" | "slate"> = { VERY_HIGH: "red", HIGH: "amber", MED: "slate" };

function useGet<T>(key: string, url: string) {
  return useQuery<T>({ queryKey: [key], queryFn: async () => (await api.get(url)).data });
}

export default function WorkforcePlanning() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const { data: ov, isLoading } = useGet<Overview>("wfp-overview", "/workforce-planning/overview");
  const { data: supply } = useGet<SupplyRow[]>("wfp-supply", "/workforce-planning/supply-demand");
  const { data: coverage } = useGet<CoverageRow[]>("wfp-coverage", "/workforce-planning/coverage");
  const { data: demand } = useGet<DemandRow[]>("wfp-demand", "/workforce-planning/training-demand");
  const { data: forecast } = useGet<Forecast>("wfp-forecast", "/readiness/forecast");
  const { data: companies } = useGet<Company[]>("wfp-bench", "/benchmarking/companies");

  if (isLoading || !ov) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("wfp.title")} subtitle={t("wfp.subtitle")} icon={Target} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label={t("wfp.readyPct")} value={ov.ready_pct} suffix="%" icon={TrendingUp} tone="green" />
        <StatCard label={t("wfp.atRisk")} value={ov.critical_roles_at_risk} icon={ShieldAlert} tone="red" hint={`${ov.critical_roles_covered}/${ov.critical_roles} ${t("wfp.covered")}`} />
        <StatCard label={t("wfp.trainingNeeds")} value={ov.open_training_needs} icon={GraduationCap} tone="amber" />
        <StatCard label={t("wfp.knowledgeAtRisk")} value={ov.knowledge_at_risk} icon={Building2} tone="slate" />
      </div>

      {/* Predictive pipeline */}
      {forecast && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-petro" />
            <h2 className="font-semibold text-ink">{t("wfp.forecast")}</h2>
            <Badge tone="blue">{forecast.horizon_months} {t("succession.months")}</Badge>
          </div>
          <div className="flex items-end gap-6">
            <div>
              <div className="text-xs text-ink-muted">{t("wfp.readyNow")}</div>
              <div className="text-3xl font-bold text-ink tabular-nums">{forecast.current_ready}</div>
            </div>
            <div className="text-2xl text-ink-muted pb-1">→</div>
            <div>
              <div className="text-xs text-ink-muted">{t("wfp.projectedReady")}</div>
              <div className="text-3xl font-bold text-emerald-600 tabular-nums">{forecast.projected_ready}</div>
            </div>
            <Badge tone="green">+{forecast.projected_uplift} {t("wfp.uplift")}</Badge>
            <div className="ms-auto text-xs text-ink-muted self-center">{forecast.open_gaps} {t("wfp.openGaps")}</div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supply / demand */}
        <Card>
          <h2 className="font-semibold text-ink mb-3">{t("wfp.supplyDemand")}</h2>
          <div className="space-y-2.5">
            {(supply ?? []).map((s) => (
              <div key={s.family}>
                <div className="flex justify-between text-sm mb-0.5">
                  <span className="text-ink">{s.family}</span>
                  <span className="text-ink-muted tabular-nums">{s.ready}/{s.headcount} {t("wfp.ready")} · {s.roles} {t("wfp.roles")}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${s.ready_pct >= 60 ? "bg-emerald-500" : s.ready_pct >= 30 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${s.ready_pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Critical role coverage */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 font-semibold text-ink">{t("wfp.coverage")}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                  <th className="py-2 px-5 text-start font-medium">{t("dept.role")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("succession.crit")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("succession.bench")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {(coverage ?? []).map((c) => (
                  <tr key={c.job_id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 px-5 font-medium text-ink">{ar ? c.title_ar : c.title_en}</td>
                    <td className="py-2 px-2"><Badge tone={CRIT[c.criticality] ?? "slate"}>{c.criticality}</Badge></td>
                    <td className="py-2 px-2 tabular-nums">{c.bench_strength}</td>
                    <td className="py-2 px-2"><Badge tone={c.coverage === "COVERED" ? "green" : "red"}>{t(`wfp.cov_${c.coverage}`)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Training demand */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 font-semibold text-ink">{t("wfp.trainingDemand")}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                  <th className="py-2 px-5 text-start font-medium">{t("competencies.name")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("wfp.learners")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("wfp.totalGap")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("common.priority")}</th>
                </tr>
              </thead>
              <tbody>
                {(demand ?? []).map((d) => (
                  <tr key={d.competency_id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 px-5 font-medium text-ink">{ar ? d.competency_ar : d.competency_en}</td>
                    <td className="py-2 px-2 tabular-nums">{d.learners}</td>
                    <td className="py-2 px-2 tabular-nums">{d.total_gap}</td>
                    <td className="py-2 px-2">{d.very_high > 0 ? <Badge tone="red">{d.very_high} {t("wfp.veryHigh")}</Badge> : <span className="text-ink-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Benchmarking */}
        <Card>
          <h2 className="font-semibold text-ink mb-3">{t("wfp.benchmarking")}</h2>
          <div className="space-y-2.5">
            {(companies ?? []).map((c) => (
              <div key={c.company_id}>
                <div className="flex justify-between text-sm mb-0.5">
                  <span className="text-ink"><span className="text-ink-muted me-1">#{c.rank}</span>{ar ? c.name_ar : c.name_en}</span>
                  <span className="text-ink-muted tabular-nums">{c.avg_readiness} · {c.ready_pct}% {t("wfp.ready")}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-petro" style={{ width: `${c.avg_readiness}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
