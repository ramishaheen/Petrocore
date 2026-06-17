import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "../lib/api";

interface Node {
  id: string;
  node_type: string;
  name_en: string;
  name_ar: string;
  activity_segment: string | null;
  children: Node[];
}

function TreeNode({ node, depth }: { node: Node; depth: number }) {
  const { i18n } = useTranslation();
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 border-b border-slate-50"
        style={{ paddingInlineStart: depth * 20 }}
      >
        <span className="text-[10px] bg-petro/10 text-petro px-1.5 py-0.5 rounded">{node.node_type}</span>
        <span className="text-sm">{i18n.language === "ar" ? node.name_ar : node.name_en}</span>
        {node.activity_segment && (
          <span className="text-[10px] text-slate-400">· {node.activity_segment}</span>
        )}
      </div>
      {node.children.map((c) => (
        <TreeNode key={c.id} node={c} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function Hierarchy() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<Node[]>({
    queryKey: ["tree"],
    queryFn: async () => (await api.get("/org/tree")).data,
  });

  if (isLoading || !data) return <div>{t("common.loading")}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav.hierarchy")}</h1>
      <div className="card">
        {data.map((root) => (
          <TreeNode key={root.id} node={root} depth={0} />
        ))}
      </div>
    </div>
  );
}
