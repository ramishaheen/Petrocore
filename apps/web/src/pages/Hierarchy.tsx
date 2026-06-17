import { useQuery } from "@tanstack/react-query";
import { Network } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Node {
  id: string; node_type: string; name_en: string; name_ar: string;
  activity_segment: string | null; children: Node[];
}

const TYPE_COLOR: Record<string, string> = {
  NOC: "bg-petro text-white",
  SUBSIDIARY: "bg-petro-light text-white",
  ACTIVITY: "bg-amber-100 text-amber-700",
  DEPARTMENT: "bg-blue-100 text-blue-700",
  SECTION: "bg-slate-100 text-slate-600",
  JOB: "bg-emerald-100 text-emerald-700",
  EMPLOYEE: "bg-slate-50 text-slate-500",
};

function TreeNode({ node, depth }: { node: Node; depth: number }) {
  const { i18n } = useTranslation();
  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 border-b border-slate-50 hover:bg-petro-50/40 rounded-lg transition-colors"
        style={{ paddingInlineStart: depth * 22 + 8 }}
      >
        {depth > 0 && <span className="text-slate-200">└</span>}
        <span className={`chip ${TYPE_COLOR[node.node_type] ?? "bg-slate-100 text-slate-600"}`}>
          {node.node_type}
        </span>
        <span className="text-sm text-ink">{i18n.language === "ar" ? node.name_ar : node.name_en}</span>
        {node.activity_segment && (
          <span className="text-[10px] text-ink-muted">· {node.activity_segment}</span>
        )}
      </div>
      {node.children.map((c) => <TreeNode key={c.id} node={c} depth={depth + 1} />)}
    </div>
  );
}

export default function Hierarchy() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<Node[]>({
    queryKey: ["tree"],
    queryFn: async () => (await api.get("/org/tree")).data,
  });

  if (isLoading || !data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("nav.hierarchy")} icon={Network} />
      <Card>{data.map((root) => <TreeNode key={root.id} node={root} depth={0} />)}</Card>
    </div>
  );
}
