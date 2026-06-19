import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ClipboardList, Grid3x3, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton, StatCard } from "../components/ui";
import { api } from "../lib/api";

interface Member { id: string; name_en: string; name_ar: string; job_en?: string; job_ar?: string; readiness_index: number; status: string; }
interface Decision { id: string; kind: string; ai_recommendation: string; confidence: number; }
interface Result { competency_en: string; competency_ar: string; assessed_level: number; required_level: number; }
interface Detail { id: string; competency_results: Result[]; }

const STATUS_TONE: Record<string, "green" | "blue" | "amber" | "slate"> = {
  TRUSTED: "green", HR_VALIDATED: "blue", MANAGER_APPROVED: "amber", DRAFT: "slate",
};
function bar(v: number) { return v >= 75 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-red-500"; }
function cell(a: number, r: number) {
  const ratio = r ? a / r : 1;
  if (ratio >= 1) return "bg-emerald-500 text-white";
  if (ratio >= 0.6) return "bg-amber-400 text-white";
  return "bg-red-400 text-white";
}

export default function MyTeam() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const qc = useQueryClient();

  const team = useQuery<Member[]>({ queryKey: ["profiles"], queryFn: async () => (await api.get("/profiles")).data });
  const decisions = useQuery<Decision[]>({ queryKey: ["decisions"], queryFn: async () => (await api.get("/governance/decisions")).data });
  const members = team.data ?? [];
  const detailQueries = useQueries({
    queries: members.map((m) => ({ queryKey: ["profile", m.id], queryFn: async () => (await api.get(`/profiles/${m.id}`)).data as Detail })),
  });
  const resolve = useMutation({
    mutationFn: async (id: string) => api.post(`/governance/decisions/${id}/resolve`, { approve: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions"] }),
  });

  if (team.isLoading || !team.data) return <PageSkeleton />;
  const avg = Math.round(members.reduce((s, m) => s + m.readiness_index, 0) / (members.length || 1));
  const ready = members.filter((m) => m.readiness_index >= 75).length;
  const pending = members.filter((m) => m.status !== "TRUSTED").length;

  const details = detailQueries.map((q) => q.data).filter(Boolean) as Detail[];
  const cols = details[0]?.competency_results.map((r) => (ar ? r.competency_ar : r.competency_en).split(" ")[0]) ?? [];
  const detailById = Object.fromEntries(details.map((d) => [d.id, d]));
  const bands = [
    { en: "Ready (75+)", ar: "جاهز (+75)", n: members.filter((m) => m.readiness_index >= 75).length, c: "bg-emerald-500" },
    { en: "Developing (50–74)", ar: "قيد التطوير (50–74)", n: members.filter((m) => m.readiness_index >= 50 && m.readiness_index < 75).length, c: "bg-amber-500" },
    { en: "At risk (<50)", ar: "معرّض للخطر (<50)", n: members.filter((m) => m.readiness_index < 50).length, c: "bg-red-500" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.myTeam")} subtitle={t("team.subtitle")} icon={Users} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("team.members")} value={members.length} icon={Users} tone="blue" />
        <StatCard label={t("team.avgReadiness")} value={avg} icon={Users} tone="green" />
        <StatCard label={t("team.readyNow")} value={ready} icon={BadgeCheck} tone="green" />
        <StatCard label={t("team.pendingApprovals")} value={pending} icon={ClipboardList} tone="amber" />
      </div>

      {/* Readiness distribution */}
      <Card>
        <div className="font-semibold text-ink mb-3">{t("team.distribution")}</div>
        <div className="flex h-4 rounded-full overflow-hidden">
          {bands.map((b) => b.n > 0 && (
            <div key={b.en} className={b.c} style={{ width: `${(b.n / members.length) * 100}%` }} title={`${ar ? b.ar : b.en}: ${b.n}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          {bands.map((b) => (
            <span key={b.en} className="flex items-center gap-1.5 text-ink-soft">
              <span className={`w-2.5 h-2.5 rounded-full ${b.c}`} /> {ar ? b.ar : b.en} · {b.n}
            </span>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          <div className="px-5 py-3 font-semibold text-ink border-b border-slate-100">{t("team.roster")}</div>
          <div className="divide-y divide-slate-50">
            {members.map((m) => (
              <Link key={m.id} to={`/profiles/${m.id}`} className="flex items-center gap-4 px-5 py-3 hover:bg-petro-50/50 transition-colors">
                <span className="grid place-items-center w-9 h-9 rounded-full bg-petro-grad text-white text-xs font-bold shrink-0">
                  {(ar ? m.name_ar : m.name_en).slice(0, 1)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-ink truncate">{ar ? m.name_ar : m.name_en}</div>
                  <div className="text-xs text-ink-muted truncate">{ar ? m.job_ar : m.job_en}</div>
                </div>
                <div className="hidden sm:flex items-center gap-2 w-40">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${bar(m.readiness_index)}`} style={{ width: `${m.readiness_index}%` }} />
                  </div>
                  <span className="text-xs tabular-nums text-ink-muted w-7 text-end">{m.readiness_index}</span>
                </div>
                <Badge tone={STATUS_TONE[m.status] ?? "slate"}>{t(`profiles.status_${m.status}`)}</Badge>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="font-semibold text-ink mb-3 flex items-center gap-2"><ClipboardList size={16} className="text-petro" /> {t("team.approvals")}</div>
          {(decisions.data ?? []).length === 0 ? (
            <EmptyState icon={BadgeCheck} title={t("team.noApprovals")} />
          ) : (
            <div className="space-y-2">
              {(decisions.data ?? []).map((d) => (
                <div key={d.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="text-xs text-ink-muted mb-1">{d.kind} · {Math.round(d.confidence * 100)}%</div>
                  <div className="text-sm text-ink mb-2">{d.ai_recommendation}</div>
                  <button onClick={() => resolve.mutate(d.id)} className="btn-primary w-full text-xs py-1.5">
                    <BadgeCheck size={14} /> {t("team.approve")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Competency heatmap */}
      {cols.length > 0 && (
        <Card className="overflow-x-auto">
          <div className="font-semibold text-ink mb-3 flex items-center gap-2"><Grid3x3 size={16} className="text-petro" /> {t("team.heatmap")}</div>
          <table className="text-sm border-separate" style={{ borderSpacing: "4px" }}>
            <thead>
              <tr>
                <th className="text-start text-ink-muted font-medium pe-3">{t("team.member")}</th>
                {cols.map((c, i) => <th key={i} className="text-ink-muted font-medium px-1 text-xs">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const d = detailById[m.id];
                return (
                  <tr key={m.id}>
                    <td className="pe-3 text-ink whitespace-nowrap">{ar ? m.name_ar : m.name_en}</td>
                    {(d?.competency_results ?? []).map((r, i) => (
                      <td key={i}>
                        <span className={`grid place-items-center w-9 h-9 rounded-lg text-xs font-semibold ${cell(r.assessed_level, r.required_level)}`}
                              title={`${ar ? r.competency_ar : r.competency_en}: ${r.assessed_level}/${r.required_level}`}>
                          {r.assessed_level}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
