import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import MethodPanel from "../components/MethodPanel";
import { Badge, Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Competency {
  id: string; code: string; name_en: string; name_ar: string; family: string;
}

const FAMILY_TONE: Record<string, "blue" | "red" | "amber" | "green" | "slate" | "gold"> = {
  TECHNICAL: "blue", HSE: "red", BEHAVIORAL: "amber",
  LEADERSHIP: "gold", DIGITAL: "green", EVIDENCE_STANDARD: "slate",
};

export default function Competencies() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const { data, isLoading } = useQuery<Competency[]>({
    queryKey: ["competencies"],
    queryFn: async () => (await api.get("/competencies")).data,
  });

  if (isLoading || !data) return <PageSkeleton />;
  const Chevron = ar ? ChevronLeft : ChevronRight;

  // Group by family for a scannable, structured dictionary.
  const families = [...new Set(data.map((c) => c.family))];

  return (
    <div className="space-y-6">
      <PageHeader title={t("competencies.title")} icon={BookOpen} />
      <MethodPanel module="competencies" defaultOpen={false} />
      {families.map((fam) => (
        <Card key={fam} className="animate-slide-up">
          <div className="flex items-center gap-2 mb-3">
            <Badge tone={FAMILY_TONE[fam] ?? "slate"}>{fam}</Badge>
            <span className="text-xs text-ink-muted">
              {data.filter((c) => c.family === fam).length}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.filter((c) => c.family === fam).map((c) => (
              <Link key={c.id} to={`/competencies/${c.id}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 hover:border-petro/30 hover:bg-petro-50/40 transition-colors group">
                <span className="font-mono text-[10px] text-ink-muted bg-slate-50 rounded px-1.5 py-0.5 shrink-0">{c.code}</span>
                <span className="text-sm text-ink truncate flex-1">{ar ? c.name_ar : c.name_en}</span>
                <Chevron size={14} className="text-ink-muted group-hover:text-petro transition-colors" />
              </Link>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
