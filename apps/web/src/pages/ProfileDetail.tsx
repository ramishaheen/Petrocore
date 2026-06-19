import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, CheckCircle2, Circle, IdCard } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton, ProgressRing } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

interface CompetencyResult {
  competency_en: string; competency_ar: string;
  assessed_level: number; required_level: number; confidence: number; status: string;
}
interface Approval { role: string; decision: string; approver_user_id: string; }
interface ProfileDetailData {
  id: string; name_en: string; name_ar: string; readiness_index: number; status: string;
  competency_results: CompetencyResult[]; approvals: Approval[];
}

function status(assessed: number, required: number): { key: string; tone: "green" | "amber" | "red" | "slate" } {
  if (assessed === 0) return { key: "Not Assessed", tone: "slate" };
  const ratio = required ? assessed / required : 1;
  if (ratio >= 1) return { key: "Strong", tone: "green" };
  if (ratio >= 0.6) return { key: "Developing", tone: "amber" };
  return { key: "Needs Focus", tone: "red" };
}

export default function ProfileDetail() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const { id } = useParams();
  const role = useAuth((s) => s.role);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<ProfileDetailData>({
    queryKey: ["profile", id],
    queryFn: async () => (await api.get(`/profiles/${id}`)).data,
  });
  const approve = useMutation({
    mutationFn: async () => api.post(`/profiles/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", id] }),
  });

  if (isLoading || !data) return <PageSkeleton />;

  const canApprove = role === "LINE_MANAGER" || role === "HR_VALIDATOR";
  const signed = new Set(data.approvals.filter((a) => a.decision === "APPROVED").map((a) => a.role));

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? data.name_ar : data.name_en} subtitle={t("profiles.passport")} icon={IdCard}
        actions={canApprove && data.status !== "TRUSTED" ? (
          <button onClick={() => approve.mutate()} className="btn-primary">
            <BadgeCheck size={16} /> {t("profiles.approve")}
          </button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="flex flex-col items-center justify-center">
          <ProgressRing value={data.readiness_index} label={t("common.readiness")} />
          <div className="mt-3">
            <Badge tone={data.status === "TRUSTED" ? "green" : "slate"} icon={data.status === "TRUSTED" ? BadgeCheck : undefined}>
              {t(`profiles.status_${data.status}`)}
            </Badge>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="font-semibold text-ink mb-1">{t("profiles.trustChain")}</div>
          <p className="text-xs text-ink-muted mb-4">{t("profiles.trustHint")}</p>
          <div className="space-y-3">
            {["LINE_MANAGER", "HR_VALIDATOR"].map((r) => {
              const done = signed.has(r);
              return (
                <div key={r} className="flex items-center gap-3">
                  {done ? <CheckCircle2 size={20} className="text-emerald-500" />
                        : <Circle size={20} className="text-slate-300" />}
                  <span className={done ? "text-ink font-medium" : "text-ink-muted"}>{t(`roles.${r}`)}</span>
                  {done && <Badge tone="green">{t("profiles.signed")}</Badge>}
                </div>
              );
            })}
            <div className="flex items-center gap-3 pt-1 border-t border-slate-100 mt-2">
              <BadgeCheck size={20} className={data.status === "TRUSTED" ? "text-petro" : "text-slate-300"} />
              <span className={data.status === "TRUSTED" ? "text-petro font-semibold" : "text-ink-muted"}>
                {t("profiles.status_TRUSTED")}
              </span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="font-semibold text-ink mb-3">{t("profiles.competencies")}</div>
        {data.competency_results.length === 0 ? (
          <EmptyState title={t("profiles.noResults")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted border-b border-slate-100">
                  <th className="py-2 text-start font-medium">{t("competencies.name")}</th>
                  <th className="py-2 text-start font-medium">{t("profiles.level")}</th>
                  <th className="py-2 text-start font-medium">{t("common.confidence")}</th>
                  <th className="py-2 text-start font-medium">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.competency_results.map((c, i) => {
                  const s = status(c.assessed_level, c.required_level);
                  return (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-2.5">{ar ? c.competency_ar : c.competency_en}</td>
                      <td className="py-2.5">
                        <span className="font-semibold text-ink">{c.assessed_level}</span>
                        <span className="text-ink-muted"> / {c.required_level}</span>
                      </td>
                      <td className="py-2.5 tabular-nums">{Math.round(c.confidence * 100)}%</td>
                      <td className="py-2.5"><Badge tone={s.tone}>{s.key}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
