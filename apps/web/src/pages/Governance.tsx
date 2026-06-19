import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ShieldCheck, ShieldX, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import MethodPanel from "../components/MethodPanel";
import { Badge, Card, EmptyState, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Decision {
  id: string; kind: string; subject_ref: string;
  ai_recommendation: string; confidence: number; governance_status: string;
}

export default function Governance() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Decision[]>({
    queryKey: ["decisions"],
    queryFn: async () => (await api.get("/governance/decisions")).data,
  });
  const audit = useQuery<{ intact: boolean }>({
    queryKey: ["audit"],
    queryFn: async () => (await api.get("/governance/audit/verify")).data,
  });
  const resolve = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) =>
      api.post(`/governance/decisions/${id}/resolve`, { approve }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions"] }),
  });

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("nav.governance")} subtitle={t("governance.principle")} icon={ShieldCheck}
        actions={
          <Badge tone={audit.data?.intact ? "green" : "red"} icon={audit.data?.intact ? ShieldCheck : ShieldX}>
            {audit.data?.intact ? t("governance.chainIntact") : t("governance.chainTampered")}
          </Badge>
        }
      />

      <MethodPanel module="governance" defaultOpen={false} />
      <Card>
        {data.length === 0 ? (
          <EmptyState icon={ShieldCheck} title={t("governance.empty")} />
        ) : (
          <div className="space-y-2">
            {data.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3 hover:border-petro/20 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-ink">{d.kind}</span>
                    <Badge tone={d.confidence >= 0.75 ? "green" : "amber"}>
                      {t("common.confidence")}: {Math.round(d.confidence * 100)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-ink-muted truncate">{d.subject_ref} · {d.ai_recommendation}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => resolve.mutate({ id: d.id, approve: true })}
                          className="btn bg-emerald-600 text-white hover:bg-emerald-700">
                    <Check size={15} /> {t("governance.approve")}
                  </button>
                  <button onClick={() => resolve.mutate({ id: d.id, approve: false })}
                          className="btn bg-red-600 text-white hover:bg-red-700">
                    <X size={15} /> {t("governance.reject")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
