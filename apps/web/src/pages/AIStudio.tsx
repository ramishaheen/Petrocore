import { useQuery } from "@tanstack/react-query";
import { Bot } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Req { id: string; request_type: string; status: string; entity_type: string | null; }
interface Output { id: string; confidence_score: number; status: string; output: { text?: string }; }
interface Detail { id: string; request_type: string; status: string; outputs: Output[]; reviews: unknown[]; }
interface Template { id: string; code: string; template_name: string; use_case: string; status: string; }
interface ModelV { id: string; model_name: string; version: string; provider: string; status: string; }

const OS: Record<string, "green" | "amber" | "red" | "slate" | "blue"> = { ACCEPTED: "green", PENDING_REVIEW: "amber", MODIFIED: "blue", REJECTED: "red" };

function useGet<T>(key: string, url: string) {
  return useQuery<T>({ queryKey: [key], queryFn: async () => (await api.get(url)).data });
}

export default function AIStudio() {
  const { t } = useTranslation();
  const [sel, setSel] = useState<string | null>(null);
  const { data: reqs, isLoading } = useGet<Req[]>("ai-reqs", "/ai/requests");
  const { data: templates } = useGet<Template[]>("ai-tmpl", "/ai/prompt-templates");
  const { data: models } = useGet<ModelV[]>("ai-models", "/ai/model-versions");
  const activeId = sel ?? reqs?.[0]?.id ?? null;
  const { data: detail } = useQuery<Detail>({
    queryKey: ["ai-req", activeId], enabled: !!activeId,
    queryFn: async () => (await api.get(`/ai/requests/${activeId}`)).data,
  });
  if (isLoading || !reqs) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("aistudio.title")} subtitle={t("aistudio.subtitle")} icon={Bot} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {reqs.map((r) => (
            <button key={r.id} onClick={() => setSel(r.id)}
              className={`w-full text-start card card-hover ${r.id === activeId ? "ring-2 ring-petro" : ""}`}>
              <div className="font-semibold text-ink text-sm">{r.request_type}</div>
              <div className="text-xs text-ink-muted mt-1">{r.entity_type ?? "—"}</div>
            </button>
          ))}
        </div>
        <div className="lg:col-span-2 space-y-6">
          {detail && (
            <Card>
              <h2 className="font-semibold text-ink mb-3">{detail.request_type}</h2>
              {detail.outputs.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-100 p-3 mb-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge tone={OS[o.status] ?? "slate"}>{t(`aistudio.os_${o.status}`)}</Badge>
                    <span className="ms-auto text-xs text-ink-muted">{t("common.confidence")}</span>
                    <div className="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-full ${o.confidence_score >= 0.75 ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${o.confidence_score * 100}%` }} />
                    </div>
                    <span className="text-xs tabular-nums text-ink-soft">{Math.round(o.confidence_score * 100)}%</span>
                  </div>
                  <pre className="text-xs text-ink-soft whitespace-pre-wrap break-all">{o.output?.text}</pre>
                </div>
              ))}
              <p className="text-[11px] text-ink-muted">{t("aistudio.note")}</p>
            </Card>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <h2 className="font-semibold text-ink mb-2">{t("aistudio.templates")}</h2>
              <div className="space-y-1.5">
                {(templates ?? []).map((tm) => (
                  <div key={tm.id} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs text-ink-muted">{tm.code}</span>
                    <span className="text-ink me-auto">{tm.template_name}</span>
                    <Badge tone="green">{tm.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h2 className="font-semibold text-ink mb-2">{t("aistudio.models")}</h2>
              <div className="space-y-1.5">
                {(models ?? []).map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <span className="text-ink me-auto">{m.model_name} <span className="text-ink-muted">{m.version}</span></span>
                    <Badge tone="slate">{m.provider}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
