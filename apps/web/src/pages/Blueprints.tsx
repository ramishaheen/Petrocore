import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileStack, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface BlueprintRow {
  id: string; code: string; name: string; name_ar?: string; job_id: string;
  assessment_purpose: string; approval_status: string; version: number; competency_count: number;
}
interface BlueprintComp {
  competency_en: string; competency_ar: string; required_level: string;
  weight: number; question_count: number; evidence_required: boolean;
}
interface BlueprintRule { rule_type: string; rule_value: string; }
interface BlueprintDetail extends BlueprintRow {
  passing_threshold: number; readiness_threshold: number;
  scoring_rubric: { code: string; model: string } | null;
  competencies: BlueprintComp[]; rules: BlueprintRule[];
}
interface AIQuestion {
  id: string; competency_en: string; question_text: string; question_text_ar: string;
  question_type: string; difficulty_level: number; ai_confidence_score: number;
  risk_level: string; review_status: string; published_question_id: string | null;
}

const STATUS_TONE: Record<string, "green" | "amber" | "blue" | "slate"> = {
  PUBLISHED: "green", APPROVED: "green", UNDER_REVIEW: "amber", DRAFT: "slate", ARCHIVED: "slate",
};
const REVIEW_TONE: Record<string, "green" | "amber" | "red" | "slate"> = {
  APPROVED: "green", DRAFT: "slate", RETURNED: "amber", REJECTED: "red",
};
const TABS = ["DRAFT", "APPROVED", "RETURNED", "REJECTED"] as const;

export default function Blueprints() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("DRAFT");
  // Optimistic overlay so review actions feel live in demo mode.
  const [reviewed, setReviewed] = useState<Record<string, string>>({});

  const { data: list, isLoading } = useQuery<BlueprintRow[]>({
    queryKey: ["blueprints"],
    queryFn: async () => (await api.get("/blueprints")).data,
  });
  const activeId = selected ?? list?.[0]?.id ?? null;

  const { data: detail } = useQuery<BlueprintDetail>({
    queryKey: ["blueprint", activeId],
    queryFn: async () => (await api.get(`/blueprints/${activeId}`)).data,
    enabled: !!activeId,
  });
  const { data: questions } = useQuery<AIQuestion[]>({
    queryKey: ["ai-questions", activeId],
    queryFn: async () => (await api.get(`/ai-questions?blueprint_id=${activeId}`)).data,
    enabled: !!activeId,
  });

  const generate = useMutation({
    mutationFn: async () => (await api.post(`/blueprints/${activeId}/generate-questions`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-questions", activeId] }),
  });
  const review = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: string }) =>
      (await api.post(`/ai-questions/${id}/review`, { decision, review_role: "SME" })).data,
    onSuccess: (_d, v) => {
      const map: Record<string, string> = { Approved: "APPROVED", Returned: "RETURNED", Rejected: "REJECTED" };
      setReviewed((r) => ({ ...r, [v.id]: map[v.decision] }));
      qc.invalidateQueries({ queryKey: ["ai-questions", activeId] });
    },
  });

  if (isLoading || !list) return <PageSkeleton />;

  const effStatus = (q: AIQuestion) => reviewed[q.id] ?? q.review_status;
  const queue = (questions ?? []).filter((q) => effStatus(q) === tab);
  const counts = TABS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = (questions ?? []).filter((q) => effStatus(q) === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("blueprint.title")}
        subtitle={t("blueprint.subtitle")}
        icon={FileStack}
        actions={
          activeId ? (
            <button className="btn btn-primary" onClick={() => generate.mutate()} disabled={generate.isPending}>
              <Sparkles size={15} /> {t("blueprint.generate")}
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Blueprint list */}
        <div className="space-y-3">
          {list.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelected(b.id)}
              className={`w-full text-start card card-hover ${b.id === activeId ? "ring-2 ring-petro" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-ink-muted">{b.code}</span>
                <Badge tone={STATUS_TONE[b.approval_status] ?? "slate"}>{b.approval_status}</Badge>
              </div>
              <div className="mt-1 font-semibold text-ink">{ar ? (b.name_ar ?? b.name) : b.name}</div>
              <div className="mt-1 text-xs text-ink-soft">
                {b.assessment_purpose} · v{b.version} · {b.competency_count} {t("blueprint.competencies")}
              </div>
            </button>
          ))}
        </div>

        {/* Blueprint detail */}
        <div className="lg:col-span-2 space-y-6">
          {detail && (
            <Card>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <h2 className="font-semibold text-ink me-auto">{ar ? (detail.name_ar ?? detail.name) : detail.name}</h2>
                {detail.scoring_rubric && <Badge tone="blue">{t("blueprint.rubric")}: {detail.scoring_rubric.model}</Badge>}
                <Badge tone="slate">{t("blueprint.pass")} {Math.round(detail.passing_threshold * 100)}%</Badge>
                <Badge tone="slate">{t("blueprint.readyAt")} {Math.round(detail.readiness_threshold * 100)}%</Badge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                      <th className="py-2 px-3 text-start font-medium">{t("competencies.name")}</th>
                      <th className="py-2 px-2 text-start font-medium">{t("blueprint.required")}</th>
                      <th className="py-2 px-2 text-start font-medium">{t("blueprint.weight")}</th>
                      <th className="py-2 px-2 text-start font-medium">{t("blueprint.questions")}</th>
                      <th className="py-2 px-2 text-start font-medium">{t("blueprint.evidence")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.competencies.map((c, i) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 px-3 font-medium text-ink">{ar ? c.competency_ar : c.competency_en}</td>
                        <td className="py-2 px-2"><Badge tone="blue">{c.required_level}</Badge></td>
                        <td className="py-2 px-2 tabular-nums">{c.weight}</td>
                        <td className="py-2 px-2 tabular-nums">{c.question_count}</td>
                        <td className="py-2 px-2">{c.evidence_required ? <Badge tone="amber">{t("blueprint.required")}</Badge> : <span className="text-ink-muted">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-ink-muted self-center">{t("blueprint.rules")}:</span>
                {detail.rules.map((r, i) => (
                  <Badge key={i} tone="slate">{r.rule_type}={r.rule_value}</Badge>
                ))}
              </div>
            </Card>
          )}

          {/* AI question review workflow */}
          <Card>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-semibold text-ink">{t("blueprint.reviewTitle")}</h2>
              <div className="flex gap-1">
                {TABS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setTab(s)}
                    className={`chip ${tab === s ? "bg-petro text-white" : "bg-slate-100 text-ink-soft"}`}
                  >
                    {t(`blueprint.rs_${s}`)} {counts[s] ? `(${counts[s]})` : ""}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-ink-muted mb-3">{t("blueprint.reviewNote")}</p>

            {queue.length === 0 ? (
              <EmptyState icon={Sparkles} title={t("blueprint.emptyQueue")} />
            ) : (
              <div className="space-y-3">
                {queue.map((q) => (
                  <div key={q.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <Badge tone="blue">{q.question_type}</Badge>
                      <Badge tone="slate">{q.competency_en}</Badge>
                      <Badge tone={q.risk_level === "HIGH" ? "red" : "slate"}>{t("blueprint.risk")}: {q.risk_level}</Badge>
                      <span className="ms-auto text-xs text-ink-muted">{t("common.confidence")}</span>
                      <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full ${q.ai_confidence_score >= 0.75 ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${Math.round(q.ai_confidence_score * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-ink-soft">{Math.round(q.ai_confidence_score * 100)}%</span>
                    </div>
                    <div className="text-sm text-ink">{ar ? q.question_text_ar : q.question_text}</div>
                    {effStatus(q) === "DRAFT" ? (
                      <div className="mt-2.5 flex gap-2">
                        <button className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5"
                          onClick={() => review.mutate({ id: q.id, decision: "Approved" })} disabled={review.isPending}>
                          <CheckCircle2 size={14} /> {t("blueprint.approve")}
                        </button>
                        <button className="btn bg-amber-500 hover:bg-amber-600 text-white text-xs px-3 py-1.5"
                          onClick={() => review.mutate({ id: q.id, decision: "Returned" })} disabled={review.isPending}>
                          <RotateCcw size={14} /> {t("blueprint.return")}
                        </button>
                        <button className="btn bg-red-500 hover:bg-red-600 text-white text-xs px-3 py-1.5"
                          onClick={() => review.mutate({ id: q.id, decision: "Rejected" })} disabled={review.isPending}>
                          <XCircle size={14} /> {t("blueprint.reject")}
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Badge tone={REVIEW_TONE[effStatus(q)] ?? "slate"}>{t(`blueprint.rs_${effStatus(q)}`)}</Badge>
                        {effStatus(q) === "APPROVED" && (
                          <span className="ms-2 text-xs text-emerald-700">{t("blueprint.promoted")}</span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
