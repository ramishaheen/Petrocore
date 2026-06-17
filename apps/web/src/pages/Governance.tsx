import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { api } from "../lib/api";

interface Decision {
  id: string;
  kind: string;
  subject_ref: string;
  ai_recommendation: string;
  confidence: number;
  governance_status: string;
}

export default function Governance() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<Decision[]>({
    queryKey: ["decisions"],
    queryFn: async () => (await api.get("/governance/decisions")).data,
  });
  const audit = useQuery<{ intact: boolean }>({
    queryKey: ["audit"],
    queryFn: async () => (await api.get("/governance/audit/verify")).data,
  });
  const resolve = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) =>
      api.post(`/governance/decisions/${id}/resolve`, { approve }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["decisions"] }),
  });

  if (isLoading || !data) return <div>{t("common.loading")}</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t("nav.governance")}</h1>

      <div className="card flex items-center gap-2 text-sm">
        <span>Audit chain:</span>
        <span className={audit.data?.intact ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
          {audit.data?.intact ? "✓ intact / سليمة" : "✗ tampered"}
        </span>
      </div>

      <div className="card">
        <p className="text-xs text-slate-500 mb-3">
          AI recommends · Humans review · Evidence validates · Governance assures.
        </p>
        {data.length === 0 ? (
          <p className="text-sm text-slate-500">No pending decisions.</p>
        ) : (
          <div className="space-y-2">
            {data.map((d) => (
              <div key={d.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="text-sm">
                  <div className="font-medium">{d.kind}</div>
                  <div className="text-slate-500 text-xs">{d.subject_ref}</div>
                  <div className="text-xs">
                    {t("common.confidence")}: {Math.round(d.confidence * 100)}% · {d.ai_recommendation}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolve.mutate({ id: d.id, approve: true })}
                    className="px-3 py-1 text-xs rounded bg-emerald-600 text-white"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => resolve.mutate({ id: d.id, approve: false })}
                    className="px-3 py-1 text-xs rounded bg-red-600 text-white"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
