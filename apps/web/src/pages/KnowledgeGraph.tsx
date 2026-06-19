import { useQuery } from "@tanstack/react-query";
import { Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge, Card, EmptyState, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Node { id: string; entity_type: string; entity_id: string; label_en: string; label_ar: string; }
interface Edge { source: string; target: string; link_type: string; weight: number; }
interface Graph { nodes: Node[]; edges: Edge[]; node_count: number; edge_count: number; }
interface Summary { total_links: number; total_entities: number; by_link_type: { link_type: string; count: number }[]; }

const TYPE_COLOR: Record<string, string> = {
  Employee: "#2563eb", Competency: "#1f8a6e", Role: "#c9a227", Asset: "#db2777",
  Strategy: "#7c3aed", Project: "#0891b2", Job: "#c9a227",
};
const color = (t: string) => TYPE_COLOR[t] ?? "#64748b";

const W = 820, H = 540, CX = W / 2, CY = H / 2, R = 200;

export default function KnowledgeGraph() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const { data: g, isLoading } = useQuery<Graph>({
    queryKey: ["kg"], queryFn: async () => (await api.get("/knowledge-graph")).data,
  });
  const { data: summary } = useQuery<Summary>({
    queryKey: ["kg-summary"], queryFn: async () => (await api.get("/knowledge-graph/summary")).data,
  });

  if (isLoading || !g) return <PageSkeleton />;

  const n = g.nodes.length;
  const pos: Record<string, { x: number; y: number }> = {};
  g.nodes.forEach((node, i) => {
    const a = (2 * Math.PI * i) / Math.max(1, n) - Math.PI / 2;
    pos[node.id] = { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  });
  const types = Array.from(new Set(g.nodes.map((nd) => nd.entity_type)));

  return (
    <div className="space-y-6">
      <PageHeader title={t("graph.title")} subtitle={t("graph.subtitle")} icon={Share2} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><div className="text-sm text-ink-soft">{t("graph.entities")}</div><div className="text-3xl font-bold text-ink tabular-nums">{summary?.total_entities ?? g.node_count}</div></Card>
        <Card><div className="text-sm text-ink-soft">{t("graph.links")}</div><div className="text-3xl font-bold text-ink tabular-nums">{summary?.total_links ?? g.edge_count}</div></Card>
        <Card>
          <div className="text-sm text-ink-soft mb-1">{t("graph.byType")}</div>
          <div className="flex flex-wrap gap-1.5">
            {(summary?.by_link_type ?? []).map((l) => <Badge key={l.link_type} tone="slate">{l.link_type} · {l.count}</Badge>)}
          </div>
        </Card>
      </div>

      <Card>
        {/* Entity-type legend */}
        <div className="flex flex-wrap gap-3 mb-3">
          {types.map((ty) => (
            <span key={ty} className="inline-flex items-center gap-1.5 text-xs text-ink-soft">
              <span className="w-3 h-3 rounded-full" style={{ background: color(ty) }} />
              {t(`graph.et_${ty}`, ty)}
            </span>
          ))}
        </div>

        {g.nodes.length === 0 ? (
          <EmptyState icon={Share2} title={t("graph.empty")} />
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 640 }} role="img" aria-label={t("graph.title")}>
              {g.edges.map((e, i) => {
                const s = pos[e.source], tp = pos[e.target];
                if (!s || !tp) return null;
                return (
                  <g key={i}>
                    <line x1={s.x} y1={s.y} x2={tp.x} y2={tp.y} stroke="#cbd5e1" strokeWidth={Math.max(1, e.weight)} />
                    <title>{e.link_type}</title>
                  </g>
                );
              })}
              {g.nodes.map((node) => {
                const p = pos[node.id];
                const onLeft = p.x < CX;
                return (
                  <g key={node.id}>
                    <circle cx={p.x} cy={p.y} r={9} fill={color(node.entity_type)} stroke="#fff" strokeWidth={2} />
                    <text
                      x={onLeft ? p.x - 13 : p.x + 13} y={p.y + 4}
                      textAnchor={onLeft ? "end" : "start"}
                      className="fill-ink" style={{ fontSize: 12, fontWeight: 500 }}
                    >
                      {ar ? node.label_ar : node.label_en}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
        <p className="text-[11px] text-ink-muted mt-2">{t("graph.note")}</p>
      </Card>
    </div>
  );
}
