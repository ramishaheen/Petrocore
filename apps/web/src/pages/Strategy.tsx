import { useQuery } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Objective { id: string; level: string; title_en: string; title_ar: string; period: string; parent_objective_id: string | null; }
interface Kpi { code: string; name_en: string; name_ar: string; target_value: number; current_value: number; unit: string; }
interface Align { competency_id: string; competency_en: string; required_level: number; weight: number; }
interface Gap { competency_id: string; required_level: number; actual_avg_level: number; gap: number; readiness_pct: number; }
interface Detail extends Objective { kpis: Kpi[]; competencies: Align[]; readiness_gaps: Gap[]; }

const LEVEL_TONE: Record<string, "blue" | "green" | "amber" | "slate"> = {
  CORPORATE: "green", DEPARTMENT: "blue", ROLE: "amber", EMPLOYEE: "slate",
};

export default function Strategy() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const [sel, setSel] = useState<string | null>(null);
  const { data: objs, isLoading } = useQuery<Objective[]>({
    queryKey: ["st-objectives"], queryFn: async () => (await api.get("/strategy/objectives")).data,
  });
  const activeId = sel ?? objs?.[0]?.id ?? null;
  const { data: detail } = useQuery<Detail>({
    queryKey: ["st-objective", activeId], enabled: !!activeId,
    queryFn: async () => (await api.get(`/strategy/objectives/${activeId}`)).data,
  });
  if (isLoading || !objs) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("strategy.title")} subtitle={t("strategy.subtitle")} icon={Target} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {objs.map((o) => (
            <button key={o.id} onClick={() => setSel(o.id)}
              className={`w-full text-start card card-hover ${o.id === activeId ? "ring-2 ring-petro" : ""}`}>
              <Badge tone={LEVEL_TONE[o.level] ?? "slate"}>{t(`strategy.lvl_${o.level}`)}</Badge>
              <div className="mt-1 font-semibold text-ink">{ar ? o.title_ar : o.title_en}</div>
              <div className="text-xs text-ink-muted">{o.period}</div>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2 space-y-6">
          {detail && (
            <>
              <Card>
                <h2 className="font-semibold text-ink mb-2">{t("strategy.kpis")}</h2>
                <div className="space-y-2">
                  {detail.kpis.map((k) => (
                    <div key={k.code} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{ar ? k.name_ar : k.name_en}</span>
                      <span className="tabular-nums text-ink-soft">{k.current_value}{k.unit} / {k.target_value}{k.unit}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <h2 className="font-semibold text-ink mb-3">{t("strategy.readinessGap")}</h2>
                <div className="space-y-3">
                  {detail.readiness_gaps.map((g) => (
                    <div key={g.competency_id}>
                      <div className="flex justify-between text-sm mb-0.5">
                        <span className="text-ink">{detail.competencies.find((c) => c.competency_id === g.competency_id)?.competency_en ?? g.competency_id}</span>
                        <span className="tabular-nums text-ink-muted">L{g.actual_avg_level} / L{g.required_level} · {g.readiness_pct}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full ${g.readiness_pct >= 85 ? "bg-emerald-500" : g.readiness_pct >= 65 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${g.readiness_pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-ink-muted">{t("strategy.note")}</p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
