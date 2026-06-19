import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import { useTranslation } from "react-i18next";

import MethodPanel from "../components/MethodPanel";
import { Badge, Card, EmptyState, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Gap {
  id: string; scope: string; competency_id: string;
  current_level: number; target_level: number; gap_size: number;
  priority: string; confidence: number;
}

const PRIORITY_TONE: Record<string, "red" | "amber" | "slate"> = {
  VERY_HIGH: "red", HIGH: "amber", MEDIUM: "slate",
};

export default function Gaps() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<Gap[]>({
    queryKey: ["gaps"],
    queryFn: async () => (await api.get("/gaps")).data,
  });

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.gaps")} icon={Activity} />
      <MethodPanel module="gaps" defaultOpen={false} />
      <Card className="p-0 overflow-hidden">
        {data.length === 0 ? (
          <EmptyState icon={Activity} title={t("gaps.empty")} hint={t("gaps.emptyHint")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                  <th className="py-2.5 px-5 text-start font-medium">{t("gaps.scope")}</th>
                  <th className="py-2.5 px-2 text-start font-medium">{t("competencies.name")}</th>
                  <th className="py-2.5 px-2 text-start font-medium">{t("gaps.delta")}</th>
                  <th className="py-2.5 px-2 text-start font-medium">{t("common.priority")}</th>
                  <th className="py-2.5 px-2 text-start font-medium">{t("common.confidence")}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((g) => (
                  <tr key={g.id} className="border-b border-slate-50 last:border-0 hover:bg-petro-50/40">
                    <td className="py-2.5 px-5">{g.scope}</td>
                    <td className="py-2.5 px-2 font-mono text-xs text-ink-muted">{g.competency_id.slice(0, 8)}</td>
                    <td className="py-2.5 px-2">
                      <span className="font-semibold text-ink">{g.current_level}</span>
                      <span className="text-ink-muted"> → {g.target_level}</span>
                    </td>
                    <td className="py-2.5 px-2"><Badge tone={PRIORITY_TONE[g.priority] ?? "slate"}>{g.priority}</Badge></td>
                    <td className="py-2.5 px-2 tabular-nums">{Math.round(g.confidence * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
