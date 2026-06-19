import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plug, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Connector {
  id: string; code: string; name_en: string; name_ar: string; system_type: string;
  direction: string; status: string; sync_mode: string; last_sync_at: string | null;
}
interface SyncLog {
  id: string; connector_code: string; direction: string; entity_type: string;
  records_in: number; records_ok: number; records_failed: number; status: string; message: string; at: string | null;
}

const STATUS_TONE: Record<string, "green" | "blue" | "slate" | "red"> = {
  ACTIVE: "green", CONFIGURED: "blue", PLANNED: "slate", DISABLED: "red",
};

export default function Integrations() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const qc = useQueryClient();
  const { data: connectors, isLoading } = useQuery<Connector[]>({
    queryKey: ["connectors"], queryFn: async () => (await api.get("/integration/connectors")).data,
  });
  const { data: logs } = useQuery<SyncLog[]>({
    queryKey: ["sync-logs"], queryFn: async () => (await api.get("/integration/sync-logs")).data,
  });
  const sync = useMutation({
    mutationFn: async (code: string) => (await api.post(`/integration/connectors/${code}/sync`)).data,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sync-logs"] }); qc.invalidateQueries({ queryKey: ["connectors"] }); },
  });

  if (isLoading || !connectors) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("integrations.title")} subtitle={t("integrations.subtitle")} icon={Plug} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {connectors.map((c) => (
          <Card key={c.id} hover>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="chip bg-petro/10 text-petro">{c.system_type}</span>
                  <Badge tone={STATUS_TONE[c.status] ?? "slate"}>{t(`integrations.st_${c.status}`)}</Badge>
                </div>
                <div className="mt-1.5 font-semibold text-ink">{ar ? c.name_ar : c.name_en}</div>
                <div className="text-xs text-ink-muted mt-0.5">{c.direction} · {c.sync_mode}</div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {t("integrations.lastSync")}: {c.last_sync_at ? new Date(c.last_sync_at).toLocaleString() : "—"}
                </div>
              </div>
              <button
                className="btn btn-primary text-xs px-2.5 py-1.5"
                onClick={() => sync.mutate(c.code)} disabled={sync.isPending}
                title={t("integrations.syncNow")}
              >
                <RefreshCw size={13} /> {t("integrations.sync")}
              </button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-semibold text-ink">{t("integrations.syncLogs")}</div>
        {!logs || logs.length === 0 ? (
          <EmptyState icon={RefreshCw} title={t("integrations.noLogs")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                  <th className="py-2 px-5 text-start font-medium">{t("integrations.connector")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("integrations.entity")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("integrations.records")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("common.status")}</th>
                  <th className="py-2 px-2 text-start font-medium">{t("integrations.when")}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 px-5 font-mono text-xs text-ink">{s.connector_code}</td>
                    <td className="py-2 px-2">{s.entity_type || "—"}</td>
                    <td className="py-2 px-2 tabular-nums">{s.records_ok}/{s.records_in}</td>
                    <td className="py-2 px-2"><Badge tone={s.status === "SUCCESS" ? "green" : s.status === "PARTIAL" ? "amber" : "red"}>{s.status}</Badge></td>
                    <td className="py-2 px-2 text-ink-muted text-xs">{s.at ? new Date(s.at).toLocaleString() : "—"}</td>
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
