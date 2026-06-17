import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, ClipboardList, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton, StatCard } from "../components/ui";
import { api } from "../lib/api";

interface Member { id: string; name_en: string; name_ar: string; job_en?: string; job_ar?: string; readiness_index: number; status: string; }
interface Decision { id: string; kind: string; ai_recommendation: string; confidence: number; }

const STATUS_TONE: Record<string, "green" | "blue" | "amber" | "slate"> = {
  TRUSTED: "green", HR_VALIDATED: "blue", MANAGER_APPROVED: "amber", DRAFT: "slate",
};
function bar(v: number) { return v >= 75 ? "bg-emerald-500" : v >= 50 ? "bg-amber-500" : "bg-red-500"; }

export default function MyTeam() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const qc = useQueryClient();

  const team = useQuery<Member[]>({ queryKey: ["profiles"], queryFn: async () => (await api.get("/profiles")).data });
  const decisions = useQuery<Decision[]>({ queryKey: ["decisions"], queryFn: async () => (await api.get("/governance/decisions")).data });
  const resolve = useMutation({
    mutationFn: async (id: string) => api.post(`/governance/decisions/${id}/resolve`, { approve: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions"] }),
  });

  if (team.isLoading || !team.data) return <PageSkeleton />;
  const members = team.data;
  const avg = Math.round(members.reduce((s, m) => s + m.readiness_index, 0) / (members.length || 1));
  const ready = members.filter((m) => m.readiness_index >= 75).length;
  const pending = members.filter((m) => m.status !== "TRUSTED").length;

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.myTeam")} subtitle={t("team.subtitle")} icon={Users} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t("team.members")} value={members.length} icon={Users} tone="blue" />
        <StatCard label={t("team.avgReadiness")} value={avg} icon={Users} tone="green" />
        <StatCard label={t("team.readyNow")} value={ready} icon={BadgeCheck} tone="green" />
        <StatCard label={t("team.pendingApprovals")} value={pending} icon={ClipboardList} tone="amber" />
      </div>

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
    </div>
  );
}
