import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../lib/api";

interface Profile {
  id: string;
  employee_id: string;
  name_en: string;
  name_ar: string;
}
interface Competency {
  id: string;
  name_en: string;
  name_ar: string;
}
interface Question {
  id: string;
  kind: string;
  body_en: string;
  body_ar: string;
  options: { choices?: string[] };
}
interface Result {
  assessed_level: number;
  required_level: number;
  confidence: number;
  status: string;
  needs_human_review: boolean;
}

export default function Assessment() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const [employeeId, setEmployeeId] = useState("");
  const [competencyId, setCompetencyId] = useState("");
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [result, setResult] = useState<Result | null>(null);

  const profiles = useQuery<Profile[]>({
    queryKey: ["profiles"],
    queryFn: async () => (await api.get("/profiles")).data,
  });
  const comps = useQuery<Competency[]>({
    queryKey: ["competencies"],
    queryFn: async () => (await api.get("/competencies")).data,
  });
  const questions = useQuery<Question[]>({
    queryKey: ["questions", competencyId],
    queryFn: async () => (await api.get(`/assessments/questions/${competencyId}`)).data,
    enabled: !!competencyId,
  });

  const submit = useMutation({
    mutationFn: async () => {
      const payload = {
        employee_id: employeeId,
        competency_id: competencyId,
        responses: (questions.data ?? []).map((q) => ({
          question_id: q.id,
          choice: q.kind === "MCQ" ? responses[q.id] ?? null : null,
          score: q.kind !== "MCQ" ? (responses[q.id] ?? 0) / 5 : 0,
        })),
      };
      return (await api.post("/assessments/grade", payload)).data as Result;
    },
    onSuccess: (data) => setResult(data),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("assessment.title")}</h1>

      <div className="card grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="text-sm">
          {t("profiles.employee")}
          <select
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={employeeId}
            onChange={(e) => { setEmployeeId(e.target.value); setResult(null); }}
          >
            <option value="">—</option>
            {(profiles.data ?? []).map((p) => (
              <option key={p.id} value={p.employee_id}>{ar ? p.name_ar : p.name_en}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          {t("competencies.title")}
          <select
            className="w-full border rounded-lg px-3 py-2 mt-1"
            value={competencyId}
            onChange={(e) => { setCompetencyId(e.target.value); setResponses({}); setResult(null); }}
          >
            <option value="">—</option>
            {(comps.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{ar ? c.name_ar : c.name_en}</option>
            ))}
          </select>
        </label>
      </div>

      {competencyId && questions.data && (
        <div className="card space-y-4">
          <div className="font-semibold">{t("assessment.questions")}</div>
          {questions.data.map((q) => (
            <div key={q.id} className="border-b last:border-0 pb-3">
              <div className="text-sm mb-2">
                <span className="text-[10px] bg-petro/10 text-petro px-1.5 py-0.5 rounded me-2">{q.kind}</span>
                {ar ? q.body_ar : q.body_en}
              </div>
              {q.kind === "MCQ" ? (
                <div className="flex gap-3 flex-wrap">
                  {(q.options.choices ?? []).map((opt, idx) => (
                    <label key={idx} className="text-sm flex items-center gap-1">
                      <input
                        type="radio"
                        name={q.id}
                        checked={responses[q.id] === idx}
                        onChange={() => setResponses((r) => ({ ...r, [q.id]: idx }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <label className="text-sm flex items-center gap-2">
                  {t("assessment.selfScore")}
                  <input
                    type="range" min={0} max={5} step={1}
                    value={responses[q.id] ?? 0}
                    onChange={(e) => setResponses((r) => ({ ...r, [q.id]: Number(e.target.value) }))}
                  />
                  <span className="font-semibold">{responses[q.id] ?? 0}/5</span>
                </label>
              )}
            </div>
          ))}
          <button
            disabled={!employeeId || submit.isPending}
            onClick={() => submit.mutate()}
            className="bg-petro text-white px-4 py-2 rounded-lg hover:bg-petro-light disabled:opacity-50"
          >
            {t("assessment.run")}
          </button>
        </div>
      )}

      {result && (
        <div className="card">
          <div className="font-semibold mb-3">{t("assessment.result")}</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-petro">{result.assessed_level}</div>
              <div className="text-xs text-slate-500">{t("profiles.assessed")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-slate-400">{result.required_level}</div>
              <div className="text-xs text-slate-500">{t("profiles.required")}</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-petro">{Math.round(result.confidence * 100)}%</div>
              <div className="text-xs text-slate-500">{t("common.confidence")}</div>
            </div>
            <div>
              <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${
                result.needs_human_review ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
              }`}>
                {result.status}
              </span>
            </div>
          </div>
          {result.needs_human_review && (
            <p className="text-xs text-amber-700 mt-3">{t("assessment.reviewNote")}</p>
          )}
        </div>
      )}
    </div>
  );
}
