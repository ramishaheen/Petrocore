import { useQuery } from "@tanstack/react-query";
import { Building2, Gauge, ShieldAlert, UserCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import MethodPanel from "../components/MethodPanel";
import { Badge, Card, EmptyState, PageHeader, PageSkeleton, ProgressRing, StatCard } from "../components/ui";
import { api } from "../lib/api";

interface RSStatus { code: string; name_en: string; name_ar: string; }
interface RSRow {
  entity_type: string; entity_id: string; name_en?: string; name_ar?: string;
  readiness_index: number | null; readiness_status: string | null; source_count: number;
}
interface RSDetail extends RSRow {
  factors: Record<string, number> | null;
  method_version?: string;
  breakdown?: { raw_product?: number; is_critical_role?: boolean; method_version?: string };
}

const TONE: Record<string, "green" | "amber" | "red" | "blue" | "slate" | "gold"> = {
  READY: "green", READY_MINOR_GAPS: "blue", DEVELOPMENT_REQUIRED: "amber",
  NOT_READY_CRITICAL: "red", EVIDENCE_INSUFFICIENT: "slate", REASSESSMENT_REQUIRED: "amber",
  SUCCESSION_CANDIDATE: "gold", HIGH_POTENTIAL: "gold",
};
const FACTOR_KEYS = [
  "competency_score", "evidence_confidence", "data_quality",
  "risk_adjustment", "role_criticality", "recency",
] as const;

export default function Readiness() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const [selected, setSelected] = useState<RSRow | null>(null);

  const { data: statuses } = useQuery<RSStatus[]>({
    queryKey: ["readiness-statuses"],
    queryFn: async () => (await api.get("/readiness/statuses")).data,
  });
  const { data: rows, isLoading } = useQuery<RSRow[]>({
    queryKey: ["readiness"],
    queryFn: async () => (await api.get("/readiness")).data,
  });

  const active = selected ?? rows?.find((r) => r.entity_type === "EMPLOYEE") ?? rows?.[0] ?? null;
  const path = active ? (active.entity_type === "EMPLOYEE" ? "employees" : "nodes") : null;
  const { data: detail } = useQuery<RSDetail>({
    queryKey: ["readiness-detail", active?.entity_type, active?.entity_id],
    queryFn: async () => (await api.get(`/readiness/${path}/${active!.entity_id}`)).data,
    enabled: !!active,
  });

  if (isLoading || !rows) return <PageSkeleton />;

  const statusName = (code: string | null) => {
    const s = statuses?.find((x) => x.code === code);
    return s ? (ar ? s.name_ar : s.name_en) : (code ?? "—");
  };
  const emps = rows.filter((r) => r.entity_type === "EMPLOYEE" && (r.readiness_index ?? 0) > 0);
  const avg = emps.length ? Math.round(emps.reduce((a, r) => a + (r.readiness_index ?? 0), 0) / emps.length) : 0;
  const ready = rows.filter((r) => r.readiness_status === "READY").length;
  const critical = rows.filter((r) => r.readiness_status === "NOT_READY_CRITICAL").length;
  const insufficient = rows.filter((r) => r.readiness_status === "EVIDENCE_INSUFFICIENT").length;
  const label = (r: RSRow) => (ar ? (r.name_ar ?? r.entity_id) : (r.name_en ?? r.entity_id));

  return (
    <div className="space-y-6">
      <PageHeader title={t("readiness.title")} subtitle={t("readiness.subtitle")} icon={Gauge} />

      <MethodPanel module="readiness" defaultOpen={false} />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label={t("readiness.avgIndex")} value={avg} icon={Gauge} tone="green" />
        <StatCard label={t("readiness.readyCount")} value={ready} icon={UserCircle} tone="green" />
        <StatCard label={t("readiness.criticalCount")} value={critical} icon={ShieldAlert} tone="red" />
        <StatCard label={t("readiness.insufficientCount")} value={insufficient} icon={Building2} tone="slate" />
      </div>

      {/* Status legend */}
      <Card>
        <div className="text-sm font-medium text-ink mb-2">{t("readiness.statusCatalog")}</div>
        <div className="flex flex-wrap gap-2">
          {(statuses ?? []).map((s) => (
            <Badge key={s.code} tone={TONE[s.code] ?? "slate"}>{ar ? s.name_ar : s.name_en}</Badge>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity readiness table */}
        <Card className="lg:col-span-2 p-0 overflow-hidden">
          {rows.length === 0 ? (
            <EmptyState icon={Gauge} title={t("readiness.empty")} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-ink-muted border-b border-slate-100 bg-slate-50/50">
                    <th className="py-2.5 px-5 text-start font-medium">{t("readiness.entity")}</th>
                    <th className="py-2.5 px-2 text-start font-medium">{t("readiness.type")}</th>
                    <th className="py-2.5 px-2 text-start font-medium">{t("readiness.index")}</th>
                    <th className="py-2.5 px-2 text-start font-medium">{t("common.status")}</th>
                    <th className="py-2.5 px-2 text-start font-medium">{t("readiness.sources")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={`${r.entity_type}:${r.entity_id}`}
                      onClick={() => setSelected(r)}
                      className={`border-b border-slate-50 last:border-0 cursor-pointer hover:bg-petro-50/40 ${
                        active && active.entity_id === r.entity_id && active.entity_type === r.entity_type ? "bg-petro-50/60" : ""
                      }`}
                    >
                      <td className="py-2.5 px-5 font-medium text-ink">{label(r)}</td>
                      <td className="py-2.5 px-2">
                        <Badge tone={r.entity_type === "EMPLOYEE" ? "blue" : "slate"}>
                          {t(`readiness.et_${r.entity_type}`)}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-petro" style={{ width: `${r.readiness_index ?? 0}%` }} />
                          </div>
                          <span className="tabular-nums text-ink-soft">{r.readiness_index ?? "—"}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2"><Badge tone={TONE[r.readiness_status ?? ""] ?? "slate"}>{statusName(r.readiness_status)}</Badge></td>
                      <td className="py-2.5 px-2 tabular-nums">{r.source_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Factor breakdown — the explainability panel */}
        <Card>
          {!active || !detail ? (
            <EmptyState icon={Gauge} title={t("readiness.selectHint")} />
          ) : (
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="font-semibold text-ink">{label(active)}</div>
                <Badge tone={TONE[detail.readiness_status ?? ""] ?? "slate"}>{statusName(detail.readiness_status)}</Badge>
              </div>
              <div className="grid place-items-center my-2">
                <ProgressRing value={detail.readiness_index ?? 0} label={t("readiness.index")} />
              </div>
              {detail.breakdown?.is_critical_role && (
                <div className="text-center mb-2"><Badge tone="red" icon={ShieldAlert}>{t("readiness.criticalRole")}</Badge></div>
              )}
              <div className="text-xs text-ink-muted mb-2">{t("readiness.factorsTitle")}</div>
              <div className="space-y-2">
                {FACTOR_KEYS.map((k) => {
                  const v = detail.factors?.[k] ?? 0;
                  return (
                    <div key={k}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-ink-soft">{t(`readiness.f_${k}`)}</span>
                        <span className="tabular-nums text-ink-muted">{Math.round(v * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full ${v >= 0.75 ? "bg-emerald-500" : v >= 0.5 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${v * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 text-[11px] text-ink-muted">
                {t("readiness.method")}: {detail.method_version}
                {typeof detail.breakdown?.raw_product === "number" && <> · ∏ = {detail.breakdown.raw_product}</>}
              </div>
              <p className="mt-2 text-[11px] text-ink-muted">{t("readiness.explainNote")}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
