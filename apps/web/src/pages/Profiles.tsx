import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { api } from "../lib/api";

interface ProfileRow {
  id: string;
  name_en: string;
  name_ar: string;
  readiness_index: number;
  status: string;
}

const STATUS_COLOR: Record<string, string> = {
  TRUSTED: "bg-emerald-100 text-emerald-700",
  HR_VALIDATED: "bg-blue-100 text-blue-700",
  MANAGER_APPROVED: "bg-amber-100 text-amber-700",
  DRAFT: "bg-slate-100 text-slate-600",
};

function readinessColor(v: number) {
  if (v >= 75) return "text-emerald-600";
  if (v >= 50) return "text-amber-600";
  return "text-red-600";
}

export default function Profiles() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useQuery<ProfileRow[]>({
    queryKey: ["profiles"],
    queryFn: async () => (await api.get("/profiles")).data,
  });

  if (isLoading || !data) return <div>{t("common.loading")}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav.profiles")}</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 border-b">
              <th className="py-2 text-start">{t("profiles.employee")}</th>
              <th className="py-2 text-start">{t("common.readiness")}</th>
              <th className="py-2 text-start">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className="py-2">
                  <Link to={`/profiles/${p.id}`} className="text-petro hover:underline">
                    {i18n.language === "ar" ? p.name_ar : p.name_en}
                  </Link>
                </td>
                <td className={`py-2 font-semibold ${readinessColor(p.readiness_index)}`}>
                  {p.readiness_index}
                </td>
                <td className="py-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLOR[p.status] ?? ""}`}>
                    {t(`profiles.status_${p.status}`)}
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
