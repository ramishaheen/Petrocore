import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "../lib/api";

interface Competency {
  id: string;
  code: string;
  name_en: string;
  name_ar: string;
  family: string;
}

const FAMILY_COLORS: Record<string, string> = {
  TECHNICAL: "bg-blue-100 text-blue-700",
  HSE: "bg-red-100 text-red-700",
  BEHAVIORAL: "bg-amber-100 text-amber-700",
  LEADERSHIP: "bg-purple-100 text-purple-700",
  DIGITAL: "bg-emerald-100 text-emerald-700",
  EVIDENCE_STANDARD: "bg-slate-100 text-slate-700",
};

export default function Competencies() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery<Competency[]>({
    queryKey: ["competencies"],
    queryFn: async () => (await api.get("/competencies")).data,
  });

  if (isLoading || !data) return <div>{t("common.loading")}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("competencies.title")}</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-start text-slate-500 border-b">
              <th className="py-2 text-start">{t("competencies.code")}</th>
              <th className="py-2 text-start">{t("competencies.name")}</th>
              <th className="py-2 text-start">{t("competencies.family")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-2 font-mono text-xs">{c.code}</td>
                <td className="py-2">{i18n.language === "ar" ? c.name_ar : c.name_en}</td>
                <td className="py-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${FAMILY_COLORS[c.family] ?? ""}`}>
                    {c.family}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
