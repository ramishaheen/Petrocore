import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "../lib/api";

interface LayerReadiness {
  layer: string;
  name_en: string;
  name_ar: string;
  status: "READY" | "NEEDS_REVIEW" | "NEEDS_BUILD";
  detail: string;
}

const STATUS_COLOR: Record<string, string> = {
  READY: "bg-emerald-100 text-emerald-700",
  NEEDS_REVIEW: "bg-amber-100 text-amber-700",
  NEEDS_BUILD: "bg-red-100 text-red-700",
};

export default function Diagnostic() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery<LayerReadiness[]>({
    queryKey: ["diagnostic"],
    queryFn: async () => (await api.get("/dashboards/diagnostic")).data,
  });

  if (isLoading || !data) return <div>{t("common.loading")}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("diagnostic.title")}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map((l) => (
          <div key={l.layer} className="card flex items-start justify-between">
            <div>
              <div className="text-xs text-slate-400">{l.layer}</div>
              <div className="font-medium">{i18n.language === "ar" ? l.name_ar : l.name_en}</div>
              <div className="text-xs text-slate-500 mt-1">{l.detail}</div>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[l.status]}`}>
              {t(`diagnostic.${l.status}`)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
