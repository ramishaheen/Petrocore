import { useQuery } from "@tanstack/react-query";
import { Network } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Node {
  id: string; node_type: string; name_en: string; name_ar: string;
  activity_segment: string | null; children: Node[];
}

const TYPE_STYLE: Record<string, string> = {
  NOC: "bg-petro-grad text-white border-transparent",
  SUBSIDIARY: "bg-petro text-white border-transparent",
  ACTIVITY: "border-amber-300 text-amber-700 bg-amber-50",
  DEPARTMENT: "border-blue-300 text-blue-700 bg-blue-50",
  SECTION: "border-slate-200 text-ink bg-white",
  JOB: "border-emerald-300 text-emerald-700 bg-emerald-50",
  EMPLOYEE: "border-slate-200 text-ink-soft bg-white",
};

function OrgNode({ node }: { node: Node }) {
  const { i18n } = useTranslation();
  const ar = i18n.language === "ar";
  return (
    <li>
      <div className="org-node">
        <div className={`rounded-xl border px-4 py-2.5 shadow-soft min-w-[150px] ${TYPE_STYLE[node.node_type] ?? "border-slate-200 bg-white"}`}>
          <div className="text-[9px] uppercase tracking-wider opacity-70">{node.node_type}</div>
          <div className="text-sm font-medium leading-tight">{ar ? node.name_ar : node.name_en}</div>
          {node.activity_segment && <div className="text-[10px] opacity-70 mt-0.5">{node.activity_segment}</div>}
        </div>
      </div>
      {node.children.length > 0 && (
        <ul>{node.children.map((c) => <OrgNode key={c.id} node={c} />)}</ul>
      )}
    </li>
  );
}

export default function Hierarchy() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<Node[]>({
    queryKey: ["tree"], queryFn: async () => (await api.get("/org/tree")).data,
  });
  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.hierarchy")} subtitle={t("hierarchy.subtitle")} icon={Network} />
      <Card className="overflow-x-auto">
        <div className="orgchart inline-block min-w-full">
          <ul>{data.map((root) => <OrgNode key={root.id} node={root} />)}</ul>
        </div>
      </Card>
    </div>
  );
}
