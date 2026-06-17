import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "../lib/api";

interface Gap {
  id: string;
  scope: string;
  competency_id: string;
  current_level: number;
  target_level: number;
  gap_size: number;
  priority: string;
  confidence: number;
}

const PRIORITY: Record<string, string> = {
  VERY_HIGH: "bg-red-100 text-red-700",
  HIGH: "bg-amber-100 text-amber-700",
  MEDIUM: "bg-slate-100 text-slate-600",
};

export default function Gaps() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<Gap[]>({
    queryKey: ["gaps"],
    queryFn: async () => (await api.get("/gaps")).data,
  });

  if (isLoading || !data) return <div>{t("common.loading")}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav.gaps")}</h1>
      <div className="card overflow-x-auto">
        {data.length === 0 ? (
          <p className="text-sm text-slate-500">No gaps yet — run analysis on a profile.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 border-b">
                <th className="py-2 text-start">Scope</th>
                <th className="py-2 text-start">Competency</th>
                <th className="py-2 text-start">Current → Target</th>
                <th className="py-2 text-start">{t("common.priority")}</th>
                <th className="py-2 text-start">{t("common.confidence")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((g) => (
                <tr key={g.id} className="border-b last:border-0">
                  <td className="py-2">{g.scope}</td>
                  <td className="py-2 font-mono text-xs">{g.competency_id.slice(0, 8)}</td>
                  <td className="py-2">{g.current_level} → {g.target_level}</td>
                  <td className="py-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY[g.priority] ?? ""}`}>
                      {g.priority}
                    </span>
                  </td>
                  <td className="py-2">{Math.round(g.confidence * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
