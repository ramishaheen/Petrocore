import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Layers, PlayCircle, Target } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Cohort { competency_id: string; target_level: number; learners: string[]; size: number; }
interface Program { id: string; title_en: string; title_ar: string; method: string; provider: string; impact_kpi: string; }
interface Need { need_id: string; competency_id: string; target_level: number; priority: string; }

function Stage({ n, label, icon: Icon }: { n: number; label: string; icon: typeof Target }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="grid place-items-center w-7 h-7 rounded-full bg-petro text-white text-xs font-bold">{n}</span>
      <Icon size={16} className="text-petro" />
      <span className="font-semibold text-ink">{label}</span>
    </div>
  );
}

export default function Training() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const qc = useQueryClient();
  const [needs, setNeeds] = useState<Need[]>([]);

  const cohorts = useQuery<Cohort[]>({ queryKey: ["cohorts"], queryFn: async () => (await api.get("/training/cohorts")).data });
  const programs = useQuery<Program[]>({ queryKey: ["programs"], queryFn: async () => (await api.get("/training/programs")).data });

  const deriveNeeds = useMutation({
    mutationFn: async () => (await api.post("/training/needs?min_priority=MEDIUM")).data as Need[],
    onSuccess: (d) => { setNeeds(d); qc.invalidateQueries({ queryKey: ["cohorts"] }); },
  });
  const designProgram = useMutation({
    mutationFn: async (c: Cohort) => api.post("/training/programs", { competency_id: c.competency_id, target_level: c.target_level }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["programs"] }),
  });

  if (cohorts.isLoading || programs.isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.training")} subtitle={t("training.principle")} icon={GraduationCap} />

      <Card>
        <Stage n={1} label={t("training.before")} icon={Target} />
        <button onClick={() => deriveNeeds.mutate()} className="btn-primary mb-3">
          <PlayCircle size={16} /> {t("training.deriveNeeds")}
        </button>
        {needs.length > 0 && (
          <div className="text-xs text-ink-soft mb-3">{t("training.needsCount", { count: needs.length })}</div>
        )}
        <div className="text-sm font-medium text-ink mb-2">{t("training.cohorts")}</div>
        {(cohorts.data ?? []).length === 0 ? (
          <EmptyState icon={Layers} title={t("training.noCohorts")} />
        ) : (
          <div className="space-y-2">
            {(cohorts.data ?? []).map((c, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
                <span className="font-mono text-[10px] text-ink-muted bg-slate-50 rounded px-1.5 py-0.5">{c.competency_id.slice(0, 8)}</span>
                <Badge tone="blue">L{c.target_level}</Badge>
                <span className="text-xs text-ink-muted">{c.size} {t("training.learners")}</span>
                <button onClick={() => designProgram.mutate(c)} className="ms-auto text-xs text-petro hover:underline font-medium">
                  {t("training.designProgram")}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <Stage n={2} label={`${t("training.during")} · ${t("training.after")}`} icon={GraduationCap} />
        {(programs.data ?? []).length === 0 ? (
          <EmptyState title={t("training.noPrograms")} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(programs.data ?? []).map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-100 p-3">
                <div className="font-medium text-ink">{ar ? p.title_ar : p.title_en}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Badge tone="green">{p.method}</Badge>
                  <Badge tone="slate">{p.provider}</Badge>
                  <Badge tone="gold">KPI: {p.impact_kpi}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-ink-muted mt-3">{t("training.impactNote")}</p>
      </Card>
    </div>
  );
}
