import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Plan { id: string; plan_name: string; entity_type: string; entity_id: string; approval_status: string; }
interface Item { id: string; action_type: string; action_description: string; completion_status: string; post_assessment_required: boolean; }
interface Detail extends Plan { items: Item[]; }

const CS: Record<string, "green" | "blue" | "slate"> = { COMPLETE: "green", IN_PROGRESS: "blue", PLANNED: "slate" };

export default function DevelopmentPlans() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [sel, setSel] = useState<string | null>(null);
  const [reassessed, setReassessed] = useState(false);
  const { data: list, isLoading } = useQuery<Plan[]>({
    queryKey: ["dev-plans"], queryFn: async () => (await api.get("/development/plans")).data,
  });
  const activeId = sel ?? list?.[0]?.id ?? null;
  const { data: detail } = useQuery<Detail>({
    queryKey: ["dev-plan", activeId], enabled: !!activeId,
    queryFn: async () => (await api.get(`/development/plans/${activeId}`)).data,
  });
  const complete = useMutation({
    mutationFn: async (itemId: string) =>
      (await api.post(`/development/plans/${activeId}/items/${itemId}/complete`)).data as { reassessment: string | null },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["dev-plan", activeId] });
      qc.invalidateQueries({ queryKey: ["my-assignments"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      if (d.reassessment) setReassessed(true);
    },
  });
  if (isLoading || !list) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("devplan.title")} subtitle={t("devplan.subtitle")} icon={GraduationCap} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {list.length === 0 ? <EmptyState icon={GraduationCap} title={t("devplan.empty")} /> : list.map((p) => (
            <button key={p.id} onClick={() => setSel(p.id)}
              className={`w-full text-start card card-hover ${p.id === activeId ? "ring-2 ring-petro" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink">{p.plan_name}</span>
                <Badge tone={p.approval_status === "APPROVED" ? "green" : "slate"}>{p.approval_status}</Badge>
              </div>
              <div className="text-xs text-ink-muted mt-1">{p.entity_type}</div>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2">
          {detail && (
            <Card>
              <h2 className="font-semibold text-ink mb-3">{detail.plan_name}</h2>
              <div className="space-y-2">
                {detail.items.map((it) => (
                  <div key={it.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone="blue">{it.action_type}</Badge>
                        <Badge tone={CS[it.completion_status] ?? "slate"}>{t(`devplan.cs_${it.completion_status}`)}</Badge>
                        {it.post_assessment_required && <Badge tone="amber">{t("devplan.postAssess")}</Badge>}
                      </div>
                      {it.completion_status !== "COMPLETE" && (
                        <button onClick={() => complete.mutate(it.id)} disabled={complete.isPending}
                                className="btn-soft py-1 px-2.5 text-xs">
                          {complete.isPending && complete.variables === it.id
                            ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                          {t("devplan.markComplete")}
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-ink mt-1.5">{it.action_description}</div>
                  </div>
                ))}
              </div>
              {reassessed && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
                  <CheckCircle2 size={16} /> {t("devplan.reassessQueued")}
                </div>
              )}
              <p className="mt-3 text-[11px] text-ink-muted">{t("devplan.note")}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
