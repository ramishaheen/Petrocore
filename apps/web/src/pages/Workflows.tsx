import { useQuery } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Instance { id: string; workflow_type: string; entity_type: string; entity_id: string; status: string; current_step: number; }
interface Step { step_order: number; step_name: string; approver_role: string; status: string; }
interface Detail extends Instance { steps: Step[]; }
interface PermRole { id: string; role_name: string; role_scope: string; description: string; }

const SS: Record<string, "green" | "amber" | "red" | "slate"> = { APPROVED: "green", PENDING: "amber", REJECTED: "red", OPEN: "amber" };

export default function Workflows() {
  const { t } = useTranslation();
  const [sel, setSel] = useState<string | null>(null);
  const { data: list, isLoading } = useQuery<Instance[]>({
    queryKey: ["workflows"], queryFn: async () => (await api.get("/workflows")).data,
  });
  const { data: roles } = useQuery<PermRole[]>({
    queryKey: ["perm-roles"], queryFn: async () => (await api.get("/permission-roles")).data,
  });
  const activeId = sel ?? list?.[0]?.id ?? null;
  const { data: detail } = useQuery<Detail>({
    queryKey: ["workflow", activeId], enabled: !!activeId,
    queryFn: async () => (await api.get(`/workflows/${activeId}`)).data,
  });
  if (isLoading || !list) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("workflows.title")} subtitle={t("workflows.subtitle")} icon={GitBranch} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {list.map((w) => (
            <button key={w.id} onClick={() => setSel(w.id)}
              className={`w-full text-start card card-hover ${w.id === activeId ? "ring-2 ring-petro" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-ink text-sm">{w.workflow_type}</span>
                <Badge tone={SS[w.status] ?? "slate"}>{w.status}</Badge>
              </div>
              <div className="text-xs text-ink-muted mt-1">{w.entity_type}</div>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2 space-y-6">
          {detail && (
            <Card>
              <h2 className="font-semibold text-ink mb-3">{detail.workflow_type}</h2>
              <ol className="space-y-2">
                {detail.steps.map((s) => (
                  <li key={s.step_order} className="flex items-center gap-3">
                    <span className={`grid place-items-center w-7 h-7 rounded-full text-xs font-bold ${s.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" : s.step_order === detail.current_step ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{s.step_order}</span>
                    <span className="text-sm text-ink me-auto">{s.step_name}</span>
                    <Badge tone="slate">{s.approver_role}</Badge>
                    <Badge tone={SS[s.status] ?? "slate"}>{t(`workflows.ss_${s.status}`)}</Badge>
                  </li>
                ))}
              </ol>
            </Card>
          )}
          <Card>
            <h2 className="font-semibold text-ink mb-2">{t("workflows.permRoles")}</h2>
            <div className="space-y-2">
              {(roles ?? []).map((r) => (
                <div key={r.id} className="flex items-center gap-2 text-sm">
                  <span className="text-ink font-medium me-auto">{r.role_name}</span>
                  <Badge tone="blue">{r.role_scope}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
