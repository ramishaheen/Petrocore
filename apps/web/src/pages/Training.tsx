import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../lib/api";

interface Cohort {
  competency_id: string;
  target_level: number;
  learners: string[];
  size: number;
}
interface Program {
  id: string;
  title_en: string;
  title_ar: string;
  method: string;
  provider: string;
  impact_kpi: string;
}
interface Need {
  need_id: string;
  competency_id: string;
  target_level: number;
  priority: string;
}

export default function Training() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const qc = useQueryClient();
  const [needs, setNeeds] = useState<Need[]>([]);

  const cohorts = useQuery<Cohort[]>({
    queryKey: ["cohorts"],
    queryFn: async () => (await api.get("/training/cohorts")).data,
  });
  const programs = useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: async () => (await api.get("/training/programs")).data,
  });

  const deriveNeeds = useMutation({
    mutationFn: async () => (await api.post("/training/needs?min_priority=MEDIUM")).data as Need[],
    onSuccess: (data) => { setNeeds(data); qc.invalidateQueries({ queryKey: ["cohorts"] }); },
  });
  const designProgram = useMutation({
    mutationFn: async (c: Cohort) =>
      api.post("/training/programs", { competency_id: c.competency_id, target_level: c.target_level }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });

  const Stage = ({ n, label }: { n: number; label: string }) => (
    <div className="flex items-center gap-2">
      <span className="w-6 h-6 grid place-items-center rounded-full bg-petro text-white text-xs">{n}</span>
      <span className="font-semibold">{label}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.training")}</h1>
      <p className="text-xs text-slate-500">{t("training.principle")}</p>

      {/* BEFORE */}
      <div className="card space-y-3">
        <Stage n={1} label={t("training.before")} />
        <button
          onClick={() => deriveNeeds.mutate()}
          className="text-xs bg-petro text-white px-3 py-1.5 rounded-lg hover:bg-petro-light"
        >
          {t("training.deriveNeeds")}
        </button>
        {needs.length > 0 && (
          <div className="text-xs text-slate-600">{t("training.needsCount", { count: needs.length })}</div>
        )}
        <div className="text-sm font-medium mt-2">{t("training.cohorts")}</div>
        {(cohorts.data ?? []).length === 0 ? (
          <p className="text-xs text-slate-400">{t("training.noCohorts")}</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-slate-500 border-b">
              <th className="py-1 text-start">{t("competencies.code")}</th>
              <th className="py-1 text-start">{t("profiles.required")}</th>
              <th className="py-1 text-start">{t("training.learners")}</th>
              <th className="py-1"></th>
            </tr></thead>
            <tbody>
              {(cohorts.data ?? []).map((c, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1 font-mono text-xs">{c.competency_id.slice(0, 8)}</td>
                  <td className="py-1">L{c.target_level}</td>
                  <td className="py-1">{c.size}</td>
                  <td className="py-1 text-end">
                    <button
                      onClick={() => designProgram.mutate(c)}
                      className="text-xs text-petro hover:underline"
                    >
                      {t("training.designProgram")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* DURING + AFTER (programs catalogue) */}
      <div className="card space-y-3">
        <Stage n={2} label={`${t("training.during")} · ${t("training.after")}`} />
        <div className="text-sm font-medium">{t("training.programs")}</div>
        {(programs.data ?? []).length === 0 ? (
          <p className="text-xs text-slate-400">{t("training.noPrograms")}</p>
        ) : (
          <div className="space-y-2">
            {(programs.data ?? []).map((p) => (
              <div key={p.id} className="border rounded-lg p-3 text-sm">
                <div className="font-medium">{ar ? p.title_ar : p.title_en}</div>
                <div className="text-xs text-slate-500">
                  {p.method} · {p.provider} · KPI: {p.impact_kpi}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400">{t("training.impactNote")}</p>
      </div>
    </div>
  );
}
