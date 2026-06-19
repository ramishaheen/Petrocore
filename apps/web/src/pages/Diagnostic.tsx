import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, ScrollText, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge, Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface LayerReadiness {
  layer: string; name_en: string; name_ar: string;
  status: "READY" | "NEEDS_REVIEW" | "NEEDS_BUILD"; detail: string;
}

const MAP = {
  READY: { tone: "green" as const, icon: CheckCircle2 },
  NEEDS_REVIEW: { tone: "amber" as const, icon: AlertCircle },
  NEEDS_BUILD: { tone: "red" as const, icon: Wrench },
};

export default function Diagnostic() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const { data, isLoading } = useQuery<LayerReadiness[]>({
    queryKey: ["diagnostic"],
    queryFn: async () => (await api.get("/dashboards/diagnostic")).data,
  });

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("diagnostic.title")} icon={ScrollText} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.map((l) => {
          const m = MAP[l.status];
          const Icon = m.icon;
          return (
            <Card key={l.layer} hover className="flex items-start gap-3 animate-slide-up">
              <span className={`grid place-items-center w-10 h-10 rounded-xl shrink-0 ${
                m.tone === "green" ? "bg-emerald-100 text-emerald-600"
                : m.tone === "amber" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
              }`}>
                <Icon size={20} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted font-mono">{l.layer}</span>
                  <Badge tone={m.tone}>{t(`diagnostic.${l.status}`)}</Badge>
                </div>
                <div className="font-medium text-ink mt-0.5">{ar ? l.name_ar : l.name_en}</div>
                <div className="text-xs text-ink-muted mt-0.5">{l.detail}</div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
