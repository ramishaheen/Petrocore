import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Building2, Layers, ShieldAlert, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { Badge, Card, PageHeader, PageSkeleton, ProgressRing, StatCard } from "../components/ui";
import { api } from "../lib/api";

interface Dept { tenant_id: string; name_en?: string; name_ar?: string; avg_readiness: number; employees: number; }
interface Succession {
  critical_roles_total: number; roles_at_risk: number; roles_at_risk_pct?: number;
  ready_successors: number; overall_readiness: number;
  pipeline: { identified: number; ready_now: number; ready_6_12m: number; ready_12m_plus: number };
}
interface Gap { id: string; competency_id: string; priority: string; gap_size: number; scope: string; }

export default function Department() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";

  const dept = useQuery<{ departments: Dept[] }>({ queryKey: ["deptReadiness"], queryFn: async () => (await api.get("/reports/department-readiness")).data });
  const succ = useQuery<Succession>({ queryKey: ["succession"], queryFn: async () => (await api.get("/reports/succession")).data });
  const gaps = useQuery<Gap[]>({ queryKey: ["gaps"], queryFn: async () => (await api.get("/gaps")).data });

  if (dept.isLoading || succ.isLoading || !dept.data || !succ.data) return <PageSkeleton />;

  const sections = dept.data.departments;
  const overall = Math.round(sections.reduce((s, d) => s + d.avg_readiness * d.employees, 0) / (sections.reduce((s, d) => s + d.employees, 0) || 1));
  const headcount = sections.reduce((s, d) => s + d.employees, 0);
  const pipe = succ.data.pipeline;
  const pipeData = [
    { name: t("dept.readyNow"), value: pipe.ready_now, fill: "#1f8a6e" },
    { name: t("dept.ready6_12"), value: pipe.ready_6_12m, fill: "#c9a227" },
    { name: t("dept.ready12"), value: pipe.ready_12m_plus, fill: "#94a3b8" },
  ];
  const topGaps = (gaps.data ?? []).filter((g) => g.priority !== "MEDIUM").slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.department")} subtitle={t("dept.subtitle")} icon={Building2} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-1 flex flex-col items-center justify-center bg-petro-grad text-white border-0">
          <div className="text-sm text-white/80 mb-3">{t("dept.readiness")}</div>
          <div className="bg-white rounded-full p-3 shadow-lift"><ProgressRing value={overall} label={t("common.readiness")} /></div>
        </Card>
        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          <StatCard label={t("dept.headcount")} value={headcount} icon={Users} tone="blue" />
          <StatCard label={t("reports.criticalRoles")} value={succ.data.critical_roles_total} icon={Layers} tone="gold" />
          <StatCard label={t("reports.atRisk")} value={succ.data.roles_at_risk} suffix={`(${succ.data.roles_at_risk_pct ?? 0}%)`} icon={ShieldAlert} tone="red" />
          <StatCard label={t("reports.readySuccessors")} value={succ.data.ready_successors} icon={Users} tone="green" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="font-semibold text-ink mb-4 flex items-center gap-2"><Building2 size={16} className="text-petro" /> {t("dept.sectionReadiness")}</div>
          <div className="space-y-3">
            {sections.map((s) => (
              <div key={s.tenant_id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink">{ar ? (s.name_ar ?? s.tenant_id) : (s.name_en ?? s.tenant_id)}</span>
                  <span className="tabular-nums text-ink-soft">{s.avg_readiness} · {s.employees}👤</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${s.avg_readiness >= 60 ? "bg-petro" : "bg-amber-500"}`} style={{ width: `${s.avg_readiness}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="font-semibold text-ink mb-2 flex items-center gap-2"><Users size={16} className="text-petro" /> {t("dept.pipeline")}</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pipeData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {pipeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 -mt-2">
            {pipeData.map((p) => (
              <div key={p.name} className="flex items-center gap-1.5 text-xs text-ink-soft">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.fill }} /> {p.name} ({p.value})
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <div className="font-semibold text-ink mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-petro" /> {t("dept.priorityGaps")}</div>
        {topGaps.length === 0 ? <div className="text-sm text-ink-muted">—</div> : (
          <div className="flex flex-wrap gap-2">
            {topGaps.map((g) => (
              <span key={g.id} className="flex items-center gap-2 rounded-xl border border-slate-100 px-3 py-2 text-sm">
                <Badge tone={g.priority === "VERY_HIGH" ? "red" : "amber"}>{g.priority}</Badge>
                <span className="font-mono text-xs text-ink-muted">{g.competency_id.slice(0, 8)}</span>
                <span className="text-ink-soft text-xs">Δ{g.gap_size}</span>
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
