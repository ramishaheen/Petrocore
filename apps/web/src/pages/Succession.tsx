import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookKey, CheckCircle2, Crown, ShieldAlert, Users, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton, StatCard } from "../components/ui";
import { api } from "../lib/api";

interface CriticalRole {
  job_id: string; job_code: string; title_en: string; title_ar: string;
  criticality: string; loss_risk: number; business_impact: number;
  bench_strength: number; ready_now: number; has_plan: boolean;
}
interface Candidate {
  id: string; employee_id: string; name_en: string; name_ar: string;
  readiness_index: number; readiness_status: string; remaining_gaps: number;
  time_to_ready_months: number; rank: number; recommendation_status: string;
}
interface Plan {
  id: string; job_id: string; plan_name: string; bench_strength: number;
  ready_now: number; candidate_count: number; approval_status: string; candidates: Candidate[];
}
interface Pipeline {
  talent_profiles: number; critical_roles_total: number; critical_roles_covered: number;
  knowledge_holders: number; knowledge_at_risk: number;
  by_segment: { segment: string; count: number }[];
}
interface Holder {
  id: string; employee_id: string; name_en?: string; name_ar?: string;
  knowledge_domain: string; criticality: string; retirement_risk: number; transfer_status: string;
}

const RS_TONE: Record<string, "green" | "amber" | "red" | "blue" | "slate" | "gold"> = {
  READY: "green", READY_MINOR_GAPS: "blue", DEVELOPMENT_REQUIRED: "amber",
  NOT_READY_CRITICAL: "red", EVIDENCE_INSUFFICIENT: "slate", SUCCESSION_CANDIDATE: "gold",
};
const CRIT_TONE: Record<string, "red" | "amber" | "slate"> = { VERY_HIGH: "red", HIGH: "amber", MED: "slate" };
const DEC_TONE: Record<string, "green" | "red" | "slate"> = { APPROVED: "green", REJECTED: "red", PENDING: "slate" };

export default function Succession() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const qc = useQueryClient();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [decided, setDecided] = useState<Record<string, string>>({});

  const { data: pipeline } = useQuery<Pipeline>({
    queryKey: ["talent-pipeline"], queryFn: async () => (await api.get("/talent/pipeline")).data,
  });
  const { data: roles, isLoading } = useQuery<CriticalRole[]>({
    queryKey: ["critical-roles"], queryFn: async () => (await api.get("/talent/critical-roles")).data,
  });
  const { data: holders } = useQuery<Holder[]>({
    queryKey: ["knowledge-holders"], queryFn: async () => (await api.get("/talent/knowledge-holders")).data,
  });

  const buildPlan = useMutation({
    mutationFn: async (jobId: string) => (await api.post(`/talent/jobs/${jobId}/succession-plan`)).data as Plan,
    onSuccess: (p) => { setPlan(p); setDecided({}); qc.invalidateQueries({ queryKey: ["critical-roles"] }); },
  });
  const decide = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) =>
      (await api.post(`/talent/successors/${id}/decision`, { approve })).data,
    onSuccess: (d) => setDecided((m) => ({ ...m, [d.id]: d.recommendation_status })),
  });

  if (isLoading || !roles) return <PageSkeleton />;
  const decStatus = (c: Candidate) => decided[c.id] ?? c.recommendation_status;

  return (
    <div className="space-y-6">
      <PageHeader title={t("succession.title")} subtitle={t("succession.subtitle")} icon={Crown} />

      {pipeline && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label={t("succession.criticalRoles")} value={pipeline.critical_roles_total} icon={ShieldAlert} tone="red" />
          <StatCard label={t("succession.covered")} value={`${pipeline.critical_roles_covered}/${pipeline.critical_roles_total}`} icon={Crown} tone="green" />
          <StatCard label={t("succession.talentProfiles")} value={pipeline.talent_profiles} icon={Users} tone="blue" />
          <StatCard label={t("succession.knowledgeAtRisk")} value={pipeline.knowledge_at_risk} icon={BookKey} tone="amber" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical roles */}
        <Card className="p-0 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 font-semibold text-ink">{t("succession.criticalRoles")}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                  <th className="py-2.5 px-5 text-start font-medium">{t("dept.role")}</th>
                  <th className="py-2.5 px-2 text-start font-medium">{t("succession.crit")}</th>
                  <th className="py-2.5 px-2 text-start font-medium">{t("succession.bench")}</th>
                  <th className="py-2.5 px-2"></th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.job_id} className="border-b border-slate-50 last:border-0 hover:bg-petro-50/40">
                    <td className="py-2.5 px-5 font-medium text-ink">{ar ? r.title_ar : r.title_en}</td>
                    <td className="py-2.5 px-2"><Badge tone={CRIT_TONE[r.criticality] ?? "slate"}>{r.criticality}</Badge></td>
                    <td className="py-2.5 px-2 tabular-nums">{r.bench_strength} <span className="text-ink-muted">/ {r.ready_now} {t("succession.ready")}</span></td>
                    <td className="py-2.5 px-2 text-end">
                      <button className="btn btn-primary text-xs px-3 py-1.5"
                        onClick={() => buildPlan.mutate(r.job_id)} disabled={buildPlan.isPending}>
                        {t("succession.buildPlan")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Knowledge continuity */}
        <Card>
          <div className="font-semibold text-ink mb-3">{t("succession.knowledgeContinuity")}</div>
          {!holders || holders.length === 0 ? (
            <EmptyState icon={BookKey} title={t("succession.noHolders")} />
          ) : (
            <div className="space-y-2">
              {holders.map((h) => (
                <div key={h.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-ink">{ar ? (h.name_ar ?? h.employee_id) : (h.name_en ?? h.employee_id)}</span>
                    <Badge tone={CRIT_TONE[h.criticality] ?? "slate"}>{h.criticality}</Badge>
                    <Badge tone={h.transfer_status === "COMPLETE" ? "green" : h.transfer_status === "IN_PROGRESS" ? "blue" : "amber"}>
                      {t(`succession.ts_${h.transfer_status}`)}
                    </Badge>
                    <span className="ms-auto text-xs text-ink-muted">{t("succession.retireRisk")} {Math.round(h.retirement_risk * 100)}%</span>
                  </div>
                  <div className="text-xs text-ink-soft mt-1">{h.knowledge_domain}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Succession plan — ranked candidates */}
      {plan && (
        <Card>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-ink">{plan.plan_name}</h2>
            <div className="flex gap-2">
              <Badge tone="blue">{t("succession.bench")}: {plan.bench_strength}</Badge>
              <Badge tone="green">{t("succession.ready")}: {plan.ready_now}</Badge>
              <Badge tone="slate">{plan.approval_status}</Badge>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                  <th className="py-2 px-3 text-start font-medium">#</th>
                  <th className="py-2 px-2 text-start font-medium">{t("team.member")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("readiness.index")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("common.status")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("succession.gaps")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("succession.timeToReady")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("succession.decision")}</th>
                </tr>
              </thead>
              <tbody>
                {plan.candidates.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 px-3 font-semibold text-ink tabular-nums">{c.rank}</td>
                    <td className="py-2 px-2 font-medium text-ink">{ar ? c.name_ar : c.name_en}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full bg-petro" style={{ width: `${c.readiness_index}%` }} />
                        </div>
                        <span className="tabular-nums text-ink-soft">{c.readiness_index}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2"><Badge tone={RS_TONE[c.readiness_status] ?? "slate"}>{c.readiness_status}</Badge></td>
                    <td className="py-2 px-2 tabular-nums">{c.remaining_gaps}</td>
                    <td className="py-2 px-2 tabular-nums">{c.time_to_ready_months} {t("succession.months")}</td>
                    <td className="py-2 px-2">
                      {decStatus(c) === "PENDING" ? (
                        <div className="flex gap-1.5">
                          <button className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2 py-1"
                            onClick={() => decide.mutate({ id: c.id, approve: true })} disabled={decide.isPending}>
                            <CheckCircle2 size={13} />
                          </button>
                          <button className="btn bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1"
                            onClick={() => decide.mutate({ id: c.id, approve: false })} disabled={decide.isPending}>
                            <XCircle size={13} />
                          </button>
                        </div>
                      ) : (
                        <Badge tone={DEC_TONE[decStatus(c)] ?? "slate"}>{t(`succession.dec_${decStatus(c)}`)}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[11px] text-ink-muted">{t("succession.governNote")}</p>
        </Card>
      )}
    </div>
  );
}
