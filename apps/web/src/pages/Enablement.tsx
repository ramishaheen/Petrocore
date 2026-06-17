import { useQuery } from "@tanstack/react-query";
import { Crosshair, Gauge, Rocket, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge, Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Candidate {
  id: string; name_en: string; name_ar: string;
  readiness: number; strategic_impact: number; score: number;
}
interface PilotData {
  candidates: Candidate[]; best_starting_point: Candidate | null; principle: string;
}
interface Calibration {
  calibration_score: number; target: number; on_target: boolean;
  scale_up_roadmap: { phase: number; en: string; ar: string }[];
}

export default function Enablement() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const pilot = useQuery<PilotData>({
    queryKey: ["pilot"], queryFn: async () => (await api.get("/enablement/pilot-entry")).data,
  });
  const calib = useQuery<Calibration>({
    queryKey: ["calibration"], queryFn: async () => (await api.get("/enablement/calibration")).data,
  });

  if (pilot.isLoading || calib.isLoading || !pilot.data || !calib.data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.enablement")} icon={Rocket} />

      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Crosshair size={18} className="text-petro" />
          <span className="font-semibold text-ink">{t("enablement.pilotEntry")}</span>
        </div>
        <p className="text-xs text-ink-muted mb-4">{pilot.data.principle}</p>
        <div className="space-y-2">
          {pilot.data.candidates.map((c) => {
            const best = pilot.data!.best_starting_point?.id === c.id;
            return (
              <div key={c.id} className={`flex items-center gap-4 rounded-xl border p-3 ${
                best ? "border-petro/40 bg-petro-50/50" : "border-slate-100"
              }`}>
                <div className="flex-1 font-medium text-ink flex items-center gap-2">
                  {ar ? c.name_ar : c.name_en}
                  {best && <Badge tone="green" icon={Trophy}>{t("enablement.best")}</Badge>}
                </div>
                <div className="text-xs text-ink-muted">{t("common.readiness")} <b className="text-ink">{c.readiness}</b></div>
                <div className="text-xs text-ink-muted">{t("enablement.impact")} <b className="text-ink">{c.strategic_impact}</b></div>
                <div className="w-14 text-end text-lg font-bold text-petro tabular-nums">{c.score}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Gauge size={18} className="text-petro" />
            <span className="font-semibold text-ink">{t("enablement.calibration")}</span>
          </div>
          <Badge tone={calib.data.on_target ? "green" : "amber"}>
            {calib.data.calibration_score}% / {calib.data.target}%
          </Badge>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-4">
          <div className={`h-full ${calib.data.on_target ? "bg-emerald-500" : "bg-amber-500"}`}
               style={{ width: `${calib.data.calibration_score}%` }} />
        </div>
        <div className="flex flex-wrap gap-2">
          {calib.data.scale_up_roadmap.map((p) => (
            <Badge key={p.phase} tone="green">{p.phase}. {ar ? p.ar : p.en}</Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
