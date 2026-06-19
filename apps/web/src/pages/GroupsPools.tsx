import { useQuery } from "@tanstack/react-query";
import { Boxes } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, PageHeader, PageSkeleton, StatCard } from "../components/ui";
import { api } from "../lib/api";

interface Group { id: string; name_en: string; name_ar: string; group_type: string; }
interface Member { employee_id: string; name_en: string; name_ar: string; readiness_index: number | null; readiness_status: string | null; }
interface Rollup { group_id: string; name_en: string; name_ar: string; members: number; assessed: number; avg_readiness: number; ready: number; member_list: Member[]; }
interface Pool { id: string; name_en: string; name_ar: string; pool_type: string; }

const RS: Record<string, "green" | "amber" | "red" | "blue" | "slate"> = {
  READY: "green", READY_MINOR_GAPS: "blue", DEVELOPMENT_REQUIRED: "amber", NOT_READY_CRITICAL: "red", EVIDENCE_INSUFFICIENT: "slate",
};

export default function GroupsPools() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const [sel, setSel] = useState<string | null>(null);
  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ["groups"], queryFn: async () => (await api.get("/groups")).data,
  });
  const { data: pools } = useQuery<Pool[]>({
    queryKey: ["talent-pools"], queryFn: async () => (await api.get("/talent-pools")).data,
  });
  const activeId = sel ?? groups?.[0]?.id ?? null;
  const { data: rollup } = useQuery<Rollup>({
    queryKey: ["group-readiness", activeId], enabled: !!activeId,
    queryFn: async () => (await api.get(`/groups/${activeId}/readiness`)).data,
  });
  if (isLoading || !groups) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("groups.title")} subtitle={t("groups.subtitle")} icon={Boxes} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div className="text-xs uppercase tracking-wide text-ink-muted px-1">{t("groups.groups")}</div>
          {groups.map((g) => (
            <button key={g.id} onClick={() => setSel(g.id)}
              className={`w-full text-start card card-hover ${g.id === activeId ? "ring-2 ring-petro" : ""}`}>
              <div className="font-semibold text-ink">{ar ? g.name_ar : g.name_en}</div>
              <Badge tone="slate">{g.group_type}</Badge>
            </button>
          ))}
          <div className="text-xs uppercase tracking-wide text-ink-muted px-1 pt-2">{t("groups.pools")}</div>
          {(pools ?? []).map((p) => (
            <Card key={p.id}>
              <div className="font-semibold text-ink">{ar ? p.name_ar : p.name_en}</div>
              <Badge tone="gold">{p.pool_type}</Badge>
            </Card>
          ))}
        </div>
        <div className="lg:col-span-2">
          {rollup && (
            <>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <StatCard label={t("groups.members")} value={rollup.members} />
                <StatCard label={t("groups.avgReadiness")} value={rollup.avg_readiness} tone="green" />
                <StatCard label={t("groups.readyNow")} value={rollup.ready} tone="blue" />
              </div>
              <Card className="p-0 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 font-semibold text-ink">{ar ? rollup.name_ar : rollup.name_en}</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                      <th className="py-2 px-5 text-start font-medium">{t("team.member")}</th>
                      <th className="py-2 px-2 text-start font-medium">{t("readiness.index")}</th>
                      <th className="py-2 px-2 text-start font-medium">{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rollup.member_list.map((m) => (
                      <tr key={m.employee_id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2 px-5 font-medium text-ink">{ar ? m.name_ar : m.name_en}</td>
                        <td className="py-2 px-2 tabular-nums">{m.readiness_index ?? "—"}</td>
                        <td className="py-2 px-2">{m.readiness_status ? <Badge tone={RS[m.readiness_status] ?? "slate"}>{m.readiness_status}</Badge> : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
