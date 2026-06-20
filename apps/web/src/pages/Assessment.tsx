import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, Loader2, Send, Sparkles, UserPlus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, PageHeader, ProgressRing } from "../components/ui";
import { api } from "../lib/api";
import { useAuth } from "../store/auth";

interface Profile { id: string; employee_id: string; name_en: string; name_ar: string; }
interface Competency { id: string; name_en: string; name_ar: string; }
interface Blueprint { id: string; name: string; name_ar: string; }
interface Question { id: string; kind: string; body_en: string; body_ar: string; options: { choices?: string[] }; }
interface Result {
  assessed_level: number; required_level: number; confidence: number; status: string; needs_human_review: boolean;
}

export default function Assessment() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const role = useAuth((s) => s.role);
  const canAssign = role !== "EMPLOYEE";
  const [employeeId, setEmployeeId] = useState("");
  const [competencyId, setCompetencyId] = useState("");
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);
  const [assignEmp, setAssignEmp] = useState("");
  const [assignBp, setAssignBp] = useState("");

  const profiles = useQuery<Profile[]>({ queryKey: ["profiles"], queryFn: async () => (await api.get("/profiles")).data });
  const comps = useQuery<Competency[]>({ queryKey: ["competencies"], queryFn: async () => (await api.get("/competencies")).data });
  const blueprints = useQuery<Blueprint[]>({ queryKey: ["blueprints"], queryFn: async () => (await api.get("/blueprints")).data, enabled: canAssign });
  const assign = useMutation({
    mutationFn: async () => api.post("/assessment-assignments", { employee_id: assignEmp, blueprint_id: assignBp, assigned_by: role }),
  });
  const questions = useQuery<Question[]>({
    queryKey: ["questions", competencyId],
    queryFn: async () => (await api.get(`/assessments/questions/${competencyId}`)).data,
    enabled: !!competencyId,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: employeeId, competency_id: competencyId,
        responses: (questions.data ?? []).map((q) => ({
          question_id: q.id,
          choice: q.kind === "MCQ" ? responses[q.id] ?? null : null,
          score: q.kind !== "MCQ" ? (responses[q.id] ?? 0) / 5 : 0,
        })),
      };
      return (await api.post("/assessments/grade", payload)).data as Result;
    },
    onSuccess: (d) => setResult(d),
  });

  const selectCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 mt-1 bg-white focus:border-petro outline-none transition-colors";

  return (
    <div className="space-y-6">
      <PageHeader title={t("assessment.title")} subtitle={t("assessment.subtitle")} icon={ClipboardCheck} />

      {canAssign && (
        <Card className="space-y-3 border-petro/15">
          <div>
            <div className="font-semibold text-ink flex items-center gap-2"><UserPlus size={16} className="text-petro" /> {t("wf.assignTitle")}</div>
            <p className="text-xs text-ink-soft mt-0.5 max-w-2xl">{t("wf.assignDesc")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <label className="text-sm text-ink-soft">
              {t("wf.employee")}
              <select className={selectCls} value={assignEmp} onChange={(e) => { setAssignEmp(e.target.value); assign.reset(); }}>
                <option value="">—</option>
                {(profiles.data ?? []).map((p) => <option key={p.id} value={p.employee_id}>{ar ? p.name_ar : p.name_en}</option>)}
              </select>
            </label>
            <label className="text-sm text-ink-soft">
              {t("wf.blueprint")}
              <select className={selectCls} value={assignBp} onChange={(e) => { setAssignBp(e.target.value); assign.reset(); }}>
                <option value="">—</option>
                {(blueprints.data ?? []).map((b) => <option key={b.id} value={b.id}>{ar ? b.name_ar : b.name}</option>)}
              </select>
            </label>
            <button disabled={!assignEmp || !assignBp || assign.isPending} onClick={() => assign.mutate()} className="btn-primary justify-center">
              {assign.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {assign.isPending ? t("wf.assigning") : t("wf.assign")}
            </button>
          </div>
          {assign.isSuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
              <CheckCircle2 size={16} /> {t("wf.assignedToast")}
            </div>
          )}
        </Card>
      )}

      <Card className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm text-ink-soft">
          {t("profiles.employee")}
          <select className={selectCls} value={employeeId}
                  onChange={(e) => { setEmployeeId(e.target.value); setResult(null); }}>
            <option value="">—</option>
            {(profiles.data ?? []).map((p) => <option key={p.id} value={p.employee_id}>{ar ? p.name_ar : p.name_en}</option>)}
          </select>
        </label>
        <label className="text-sm text-ink-soft">
          {t("competencies.title")}
          <select className={selectCls} value={competencyId}
                  onChange={(e) => { setCompetencyId(e.target.value); setResponses({}); setResult(null); }}>
            <option value="">—</option>
            {(comps.data ?? []).map((c) => <option key={c.id} value={c.id}>{ar ? c.name_ar : c.name_en}</option>)}
          </select>
        </label>
      </Card>

      {competencyId && questions.data && (
        <Card className="space-y-4">
          <div className="font-semibold text-ink">{t("assessment.questions")}</div>
          {questions.data.map((q) => (
            <div key={q.id} className="border-b border-slate-50 last:border-0 pb-3">
              <div className="text-sm mb-2 flex items-start gap-2">
                <Badge tone={q.kind === "MCQ" ? "blue" : "gold"}>{q.kind}</Badge>
                <span className="text-ink">{ar ? q.body_ar : q.body_en}</span>
              </div>
              {q.kind === "MCQ" ? (
                <div className="flex gap-3 flex-wrap ps-1">
                  {(q.options.choices ?? []).map((opt, idx) => (
                    <label key={idx} className="text-sm flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name={q.id} className="accent-petro"
                             checked={responses[q.id] === idx}
                             onChange={() => setResponses((r) => ({ ...r, [q.id]: idx }))} />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <label className="text-sm flex items-center gap-3 ps-1">
                  {t("assessment.selfScore")}
                  <input type="range" min={0} max={5} step={1} className="accent-petro"
                         value={responses[q.id] ?? 0}
                         onChange={(e) => setResponses((r) => ({ ...r, [q.id]: Number(e.target.value) }))} />
                  <span className="font-semibold text-ink tabular-nums">{responses[q.id] ?? 0}/5</span>
                </label>
              )}
            </div>
          ))}
          <button disabled={!employeeId || submit.isPending} onClick={() => submit.mutate()} className="btn-primary">
            {submit.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {t("assessment.run")}
          </button>
        </Card>
      )}

      {result && (
        <Card className="animate-slide-up">
          <div className="font-semibold text-ink mb-4">{t("assessment.result")}</div>
          <div className="flex items-center gap-8 flex-wrap">
            <ProgressRing value={(result.assessed_level / 5) * 100} label={t("profiles.level")} size={116} />
            <div className="space-y-2">
              <div className="text-sm text-ink-soft">{t("profiles.level")}:
                <b className="text-ink ms-1">{result.assessed_level}</b>
                <span className="text-ink-muted"> / {result.required_level}</span>
              </div>
              <div className="text-sm text-ink-soft">{t("common.confidence")}:
                <b className="text-ink ms-1">{Math.round(result.confidence * 100)}%</b>
              </div>
              <Badge tone={result.needs_human_review ? "amber" : "green"}>{result.status}</Badge>
              {result.needs_human_review && (
                <p className="text-xs text-amber-700 max-w-sm">{t("assessment.reviewNote")}</p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
