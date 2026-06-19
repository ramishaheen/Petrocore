import { useQuery } from "@tanstack/react-query";
import { Factory } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge, Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Equipment { id: string; tag: string; name_en: string; name_ar: string; equipment_type: string; criticality: string; risk_level: string; }
interface Exposure { task_id: string; name_en: string; name_ar: string; criticality: string; competency_en: string | null; covered_employees: number; risk_count: number; }

const CRIT: Record<string, "red" | "amber" | "slate"> = { VERY_HIGH: "red", HIGH: "amber", MED: "slate" };

function useGet<T>(key: string, url: string) {
  return useQuery<T>({ queryKey: [key], queryFn: async () => (await api.get(url)).data });
}

export default function Operations() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const { data: equipment, isLoading } = useGet<Equipment[]>("op-equip", "/operations/equipment");
  const { data: exposure } = useGet<Exposure[]>("op-exposure", "/operations/competency-exposure");
  if (isLoading || !equipment) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("ops.title")} subtitle={t("ops.subtitle")} icon={Factory} />

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold text-ink">{t("ops.equipment")}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                <th className="py-2 px-5 text-start font-medium">{t("ops.tag")}</th>
                <th className="py-2 px-2 text-start font-medium">{t("competencies.name")}</th>
                <th className="py-2 px-2 text-start font-medium">{t("ops.type")}</th>
                <th className="py-2 px-2 text-start font-medium">{t("succession.crit")}</th>
                <th className="py-2 px-2 text-start font-medium">{t("ops.risk")}</th>
              </tr>
            </thead>
            <tbody>
              {equipment.map((e) => (
                <tr key={e.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 px-5 font-mono text-xs text-ink">{e.tag}</td>
                  <td className="py-2 px-2 font-medium text-ink">{ar ? e.name_ar : e.name_en}</td>
                  <td className="py-2 px-2 text-ink-soft">{e.equipment_type}</td>
                  <td className="py-2 px-2"><Badge tone={CRIT[e.criticality] ?? "slate"}>{e.criticality}</Badge></td>
                  <td className="py-2 px-2"><Badge tone={CRIT[e.risk_level] ?? "slate"}>{e.risk_level}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold text-ink">{t("ops.exposure")}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                <th className="py-2 px-5 text-start font-medium">{t("ops.task")}</th>
                <th className="py-2 px-2 text-start font-medium">{t("competencies.name")}</th>
                <th className="py-2 px-2 text-start font-medium">{t("succession.crit")}</th>
                <th className="py-2 px-2 text-start font-medium">{t("ops.covered")}</th>
                <th className="py-2 px-2 text-start font-medium">{t("ops.risks")}</th>
              </tr>
            </thead>
            <tbody>
              {(exposure ?? []).map((x) => (
                <tr key={x.task_id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2 px-5 font-medium text-ink">{ar ? x.name_ar : x.name_en}</td>
                  <td className="py-2 px-2 text-ink-soft">{x.competency_en ?? "—"}</td>
                  <td className="py-2 px-2"><Badge tone={CRIT[x.criticality] ?? "slate"}>{x.criticality}</Badge></td>
                  <td className="py-2 px-2 tabular-nums">{x.covered_employees}</td>
                  <td className="py-2 px-2 tabular-nums">{x.risk_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-2 text-[11px] text-ink-muted">{t("ops.note")}</p>
      </Card>
    </div>
  );
}
