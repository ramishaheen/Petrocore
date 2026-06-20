import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, ShieldAlert, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, ProgressRing } from "./ui";
import { api } from "../lib/api";

interface Question { id: string; kind: string; body_en: string; body_ar: string; options: { choices?: string[] }; }
interface Section { competency_id: string; competency_en: string; competency_ar: string; required_level: number; questions: Question[]; }
interface ResultRow { competency_id: string; competency_en: string; competency_ar: string; assessed_level: number; required_level: number; confidence: number; status: string; }
interface SubmitResult { id: string; status: string; confidence: number; results: ResultRow[]; }
interface Detail { id: string; title_en: string; title_ar: string; status: string; sections: Section[]; confidence: number | null; results: ResultRow[]; }

export default function AssessmentRunner({ assignmentId, onClose }: { assignmentId: string; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const qc = useQueryClient();
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);

  const detail = useQuery<Detail>({
    queryKey: ["assignment", assignmentId],
    queryFn: async () => (await api.get(`/assessment-assignments/${assignmentId}`)).data,
  });

  const submit = useMutation({
    mutationFn: async () => (await api.post(`/assessment-assignments/${assignmentId}/submit`, { responses })).data as SubmitResult,
    onSuccess: (d) => {
      setResult(d);
      qc.invalidateQueries({ queryKey: ["my-assignments"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["decisions"] });
    },
  });

  const sections = detail.data?.sections ?? [];
  const totalQ = sections.reduce((n, s) => n + s.questions.length, 0);
  const answered = Object.keys(responses).length;
  // Show the saved result when this assignment was already submitted (View result).
  const alreadyScored = detail.data && detail.data.results?.length
    ? { id: detail.data.id, status: detail.data.status, confidence: detail.data.confidence ?? 0, results: detail.data.results }
    : null;
  const shown = result ?? alreadyScored;
  const pending = shown?.results.filter((r) => r.status === "PENDING_REVIEW").length ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 backdrop-blur-sm p-4 sm:p-8 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-2xl my-4 space-y-5 cursor-default" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="font-semibold text-ink">{ar ? detail.data?.title_ar : detail.data?.title_en}</div>
            {!shown && <div className="text-xs text-ink-muted mt-0.5">{answered} / {totalQ}</div>}
          </div>
          <button onClick={onClose} className="grid place-items-center w-8 h-8 rounded-lg text-ink-muted hover:bg-slate-100" aria-label={t("wf.close")}>
            <X size={18} />
          </button>
        </div>

        {detail.isLoading && <div className="py-10 grid place-items-center"><Loader2 className="animate-spin text-petro" /></div>}

        {/* Result view */}
        {shown ? (
          <div className="space-y-5 animate-slide-up">
            <div className="flex items-center gap-6 flex-wrap">
              <ProgressRing value={Math.round(shown.confidence * 100)} label={t("wf.overallConfidence")} size={116} />
              <div className={`flex items-start gap-2 text-sm rounded-xl p-3 ${pending ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                {pending ? <ShieldAlert size={18} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={18} className="shrink-0 mt-0.5" />}
                <span>{pending ? t("wf.routedToReview", { n: pending }) : t("wf.allApproved")}</span>
              </div>
            </div>
            <div className="space-y-2">
              {shown.results.map((r) => (
                <div key={r.competency_id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink truncate">{ar ? r.competency_ar : r.competency_en}</div>
                    <div className="text-xs text-ink-muted">{t("profiles.level")}: <b className="text-ink">{r.assessed_level}</b> / {r.required_level} · {t("common.confidence")}: {Math.round(r.confidence * 100)}%</div>
                  </div>
                  <Badge tone={r.status === "APPROVED" ? "green" : r.status === "REJECTED" ? "red" : "amber"}>{t(`wf.res_${r.status}`)}</Badge>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="btn-primary w-full justify-center"><CheckCircle2 size={16} /> {t("wf.close")}</button>
          </div>
        ) : (
          /* Take view */
          sections.map((s) => (
            <div key={s.competency_id} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink text-sm">{ar ? s.competency_ar : s.competency_en}</span>
                <Badge tone="slate">{t("profiles.level")} ≥ {s.required_level}</Badge>
              </div>
              {s.questions.map((q) => (
                <div key={q.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="text-sm mb-2 flex items-start gap-2">
                    <Badge tone={q.kind === "MCQ" ? "blue" : "gold"}>{q.kind}</Badge>
                    <span className="text-ink">{ar ? q.body_ar : q.body_en}</span>
                  </div>
                  {q.kind === "MCQ" ? (
                    <div className="flex gap-3 flex-wrap ps-1">
                      {(q.options.choices ?? []).map((opt, idx) => (
                        <label key={idx} className="text-sm flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name={q.id} className="accent-petro" checked={responses[q.id] === idx}
                                 onChange={() => setResponses((r) => ({ ...r, [q.id]: idx }))} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <label className="text-sm flex items-center gap-3 ps-1">
                      {t("assessment.selfScore")}
                      <input type="range" min={0} max={5} step={1} className="accent-petro" value={responses[q.id] ?? 0}
                             onChange={(e) => setResponses((r) => ({ ...r, [q.id]: Number(e.target.value) }))} />
                      <span className="font-semibold text-ink tabular-nums">{responses[q.id] ?? 0}/5</span>
                    </label>
                  )}
                </div>
              ))}
            </div>
          ))
        )}

        {!shown && !detail.isLoading && (
          <button disabled={answered < totalQ || submit.isPending} onClick={() => submit.mutate()} className="btn-primary w-full justify-center">
            {submit.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {submit.isPending ? t("wf.submitting") : t("wf.submit")}
          </button>
        )}
      </div>
    </div>
  );
}
