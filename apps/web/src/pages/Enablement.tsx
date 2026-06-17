import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "../lib/api";

interface Candidate {
  id: string;
  name_en: string;
  name_ar: string;
  readiness: number;
  strategic_impact: number;
  score: number;
}
interface PilotData {
  candidates: Candidate[];
  best_starting_point: Candidate | null;
  scopes: string[];
  principle: string;
}
interface Calibration {
  calibration_score: number;
  target: number;
  on_target: boolean;
  scale_up_roadmap: { phase: number; en: string; ar: string }[];
}

export default function Enablement() {
  const { t, i18n } = useTranslation();
  const pilot = useQuery<PilotData>({
    queryKey: ["pilot"],
    queryFn: async () => (await api.get("/enablement/pilot-entry")).data,
  });
  const calib = useQuery<Calibration>({
    queryKey: ["calibration"],
    queryFn: async () => (await api.get("/enablement/calibration")).data,
  });

  if (pilot.isLoading || calib.isLoading || !pilot.data || !calib.data)
    return <div>{t("common.loading")}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("nav.enablement")}</h1>

      <div className="card">
        <div className="font-semibold mb-1">{t("enablement.pilotEntry")}</div>
        <p className="text-xs text-slate-500 mb-3">{pilot.data.principle}</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 border-b">
              <th className="py-2 text-start">{t("enablement.scope")}</th>
              <th className="py-2 text-start">{t("common.readiness")}</th>
              <th className="py-2 text-start">{t("enablement.impact")}</th>
              <th className="py-2 text-start">{t("enablement.score")}</th>
            </tr>
          </thead>
          <tbody>
            {pilot.data.candidates.map((c) => (
              <tr
                key={c.id}
                className={`border-b last:border-0 ${
                  pilot.data!.best_starting_point?.id === c.id ? "bg-petro/5 font-medium" : ""
                }`}
              >
                <td className="py-2">{i18n.language === "ar" ? c.name_ar : c.name_en}</td>
                <td className="py-2">{c.readiness}</td>
                <td className="py-2">{c.strategic_impact}</td>
                <td className="py-2">{c.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">{t("enablement.calibration")}</div>
          <div className={`text-2xl font-bold ${calib.data.on_target ? "text-emerald-600" : "text-amber-600"}`}>
            {calib.data.calibration_score}% / {calib.data.target}%
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {calib.data.scale_up_roadmap.map((p) => (
            <span key={p.phase} className="text-xs bg-petro/10 text-petro px-3 py-1.5 rounded-full">
              {p.phase}. {i18n.language === "ar" ? p.ar : p.en}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
