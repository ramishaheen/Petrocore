import { useQuery } from "@tanstack/react-query";
import { Boxes, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { Badge, Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface ProfileRow {
  id: string; name_en: string; name_ar: string; readiness_index: number; status: string;
}

const STATUS_TONE: Record<string, "green" | "blue" | "amber" | "slate"> = {
  TRUSTED: "green", HR_VALIDATED: "blue", MANAGER_APPROVED: "amber", DRAFT: "slate",
};
function readinessColor(v: number) {
  if (v >= 75) return "bg-emerald-500";
  if (v >= 50) return "bg-amber-500";
  return "bg-red-500";
}

export default function Profiles() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const Chevron = ar ? ChevronLeft : ChevronRight;
  const { data, isLoading } = useQuery<ProfileRow[]>({
    queryKey: ["profiles"],
    queryFn: async () => (await api.get("/profiles")).data,
  });

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.profiles")} subtitle={t("profiles.passport")} icon={Boxes} />
      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {data.map((p) => (
            <Link
              key={p.id} to={`/profiles/${p.id}`}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-petro-50/60 transition-colors group"
            >
              <span className="grid place-items-center w-9 h-9 rounded-full bg-petro-grad text-white text-xs font-bold shrink-0">
                {(ar ? p.name_ar : p.name_en).slice(0, 1)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-ink truncate">{ar ? p.name_ar : p.name_en}</div>
                <div className="mt-1 flex items-center gap-2">
                  <div className="h-1.5 w-32 rounded-full bg-slate-100 overflow-hidden">
                    <div className={`h-full ${readinessColor(p.readiness_index)}`}
                         style={{ width: `${p.readiness_index}%` }} />
                  </div>
                  <span className="text-xs text-ink-muted tabular-nums">{p.readiness_index}</span>
                </div>
              </div>
              <Badge tone={STATUS_TONE[p.status] ?? "slate"}>{t(`profiles.status_${p.status}`)}</Badge>
              <Chevron size={16} className="text-ink-muted group-hover:text-petro transition-colors" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
