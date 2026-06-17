import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { api } from "../lib/api";
import { useAuth } from "../store/auth";

interface CompetencyResult {
  competency_en: string;
  competency_ar: string;
  assessed_level: number;
  required_level: number;
  confidence: number;
  status: string;
}
interface Approval {
  role: string;
  decision: string;
  approver_user_id: string;
}
interface ProfileDetailData {
  id: string;
  name_en: string;
  name_ar: string;
  readiness_index: number;
  status: string;
  competency_results: CompetencyResult[];
  approvals: Approval[];
}

function statusLabel(assessed: number, required: number): { en: string; cls: string } {
  if (assessed === 0) return { en: "Not Assessed", cls: "bg-slate-100 text-slate-500" };
  const ratio = required ? assessed / required : 1;
  if (ratio >= 1) return { en: "Strong", cls: "bg-emerald-100 text-emerald-700" };
  if (ratio >= 0.6) return { en: "Developing", cls: "bg-amber-100 text-amber-700" };
  return { en: "Needs Focus", cls: "bg-red-100 text-red-700" };
}

export default function ProfileDetail() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const role = useAuth((s) => s.role);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<ProfileDetailData>({
    queryKey: ["profile", id],
    queryFn: async () => (await api.get(`/profiles/${id}`)).data,
  });
  const approve = useMutation({
    mutationFn: async () => api.post(`/profiles/${id}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile", id] }),
  });

  if (isLoading || !data) return <div>{t("common.loading")}</div>;

  const canApprove = role === "LINE_MANAGER" || role === "HR_VALIDATOR";
  const signed = new Set(data.approvals.filter((a) => a.decision === "APPROVED").map((a) => a.role));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{i18n.language === "ar" ? data.name_ar : data.name_en}</h1>
          <div className="text-sm text-slate-500">{t("profiles.passport")}</div>
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-petro">{data.readiness_index}</div>
          <div className="text-xs text-slate-500">{t("dashboard.readinessIndex")}</div>
        </div>
      </div>

      {/* Trust chain: Line Manager + HR Validation ⇒ Trusted */}
      <div className="card">
        <div className="font-semibold mb-3">{t("profiles.trustChain")}</div>
        <div className="flex items-center gap-3 flex-wrap">
          {["LINE_MANAGER", "HR_VALIDATOR"].map((r) => (
            <span
              key={r}
              className={`text-xs px-3 py-1.5 rounded-full ${
                signed.has(r) ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {signed.has(r) ? "✓ " : "○ "}
              {t(`roles.${r}`)}
            </span>
          ))}
          <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
            data.status === "TRUSTED" ? "bg-petro text-white" : "bg-slate-100 text-slate-500"
          }`}>
            {t(`profiles.status_${data.status}`)}
          </span>
          {canApprove && data.status !== "TRUSTED" && (
            <button
              onClick={() => approve.mutate()}
              className="ms-auto text-xs bg-petro text-white px-3 py-1.5 rounded-lg hover:bg-petro-light"
            >
              {t("profiles.approve")}
            </button>
          )}
        </div>
      </div>

      {/* Competency & readiness */}
      <div className="card overflow-x-auto">
        <div className="font-semibold mb-3">{t("profiles.competencies")}</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 border-b">
              <th className="py-2 text-start">{t("competencies.name")}</th>
              <th className="py-2 text-start">{t("profiles.assessed")}</th>
              <th className="py-2 text-start">{t("profiles.required")}</th>
              <th className="py-2 text-start">{t("common.confidence")}</th>
              <th className="py-2 text-start">{t("common.status")}</th>
            </tr>
          </thead>
          <tbody>
            {data.competency_results.length === 0 ? (
              <tr><td colSpan={5} className="py-3 text-slate-400">{t("profiles.noResults")}</td></tr>
            ) : (
              data.competency_results.map((c, i) => {
                const s = statusLabel(c.assessed_level, c.required_level);
                return (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{i18n.language === "ar" ? c.competency_ar : c.competency_en}</td>
                    <td className="py-2 font-semibold">{c.assessed_level}</td>
                    <td className="py-2 text-slate-500">{c.required_level}</td>
                    <td className="py-2">{Math.round(c.confidence * 100)}%</td>
                    <td className="py-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${s.cls}`}>{s.en}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
