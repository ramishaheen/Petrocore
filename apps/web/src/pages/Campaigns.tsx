import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Campaign { id: string; name: string; status: string; blueprint_id: string | null; target_entity_type: string; participants: number; }
interface Participant { id: string; employee_id: string; name_en: string; name_ar: string; status: string; }
interface Detail { id: string; name: string; status: string; participants: Participant[]; }

const PS: Record<string, "green" | "blue" | "amber" | "slate"> = { SUBMITTED: "green", REVIEWED: "green", STARTED: "blue", INVITED: "slate" };

export default function Campaigns() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const [sel, setSel] = useState<string | null>(null);
  const { data: list, isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"], queryFn: async () => (await api.get("/assessment-campaigns")).data,
  });
  const activeId = sel ?? list?.[0]?.id ?? null;
  const { data: detail } = useQuery<Detail>({
    queryKey: ["campaign", activeId], enabled: !!activeId,
    queryFn: async () => (await api.get(`/assessment-campaigns/${activeId}`)).data,
  });
  if (isLoading || !list) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("campaigns.title")} subtitle={t("campaigns.subtitle")} icon={ClipboardList} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {list.length === 0 ? <EmptyState icon={ClipboardList} title={t("campaigns.empty")} /> : list.map((c) => (
            <button key={c.id} onClick={() => setSel(c.id)}
              className={`w-full text-start card card-hover ${c.id === activeId ? "ring-2 ring-petro" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">{c.name}</span>
                <Badge tone="blue">{c.status}</Badge>
              </div>
              <div className="text-xs text-ink-muted mt-1">{c.participants} {t("campaigns.participants")}</div>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2">
          {detail && (
            <Card className="p-0 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 font-semibold text-ink">{detail.name}</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                    <th className="py-2 px-5 text-start font-medium">{t("team.member")}</th>
                    <th className="py-2 px-2 text-start font-medium">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.participants.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 px-5 font-medium text-ink">{ar ? p.name_ar : p.name_en}</td>
                      <td className="py-2 px-2"><Badge tone={PS[p.status] ?? "slate"}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-5 py-2 text-[11px] text-ink-muted">{t("campaigns.note")}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
