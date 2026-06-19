import { useQuery } from "@tanstack/react-query";
import { BookOpen, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Badge, Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface Competency { id: string; code: string; name_en: string; name_ar: string; family: string; description_en?: string; description_ar?: string; }
interface Requirement { id: string; admin_level: number; required_level: number; min_experience_band: string; risk_weight: number; activity_segment?: string | null; }
interface Families {
  admin_levels: { level: number; en: string; ar: string }[];
  proficiency_bands: { band: string; range: string; ar: string }[];
}

const FAMILY_TONE: Record<string, "blue" | "red" | "amber" | "green" | "slate" | "gold"> = {
  TECHNICAL: "blue", HSE: "red", BEHAVIORAL: "amber", LEADERSHIP: "gold", DIGITAL: "green", EVIDENCE_STANDARD: "slate",
};

export default function CompetencyDetail() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const { id } = useParams();

  const list = useQuery<Competency[]>({ queryKey: ["competencies"], queryFn: async () => (await api.get("/competencies")).data });
  const reqs = useQuery<Requirement[]>({ queryKey: ["req", id], enabled: !!id, queryFn: async () => (await api.get(`/competencies/${id}/requirements`)).data });
  const fam = useQuery<Families>({ queryKey: ["families"], queryFn: async () => (await api.get("/competencies/families")).data });

  if (list.isLoading || reqs.isLoading || fam.isLoading || !list.data || !fam.data) return <PageSkeleton />;
  const c = list.data.find((x) => x.id === id);
  if (!c) return <PageSkeleton />;

  const levelName = (lvl: number) => {
    const a = fam.data!.admin_levels.find((x) => x.level === lvl);
    return a ? (ar ? a.ar : a.en).split(" — ")[0] : `L${lvl}`;
  };
  const chart = (reqs.data ?? []).map((r) => ({ name: levelName(r.admin_level), required: r.required_level, level: r.admin_level }));
  const tone = FAMILY_TONE[c.family] ?? "slate";
  const barColor = tone === "red" ? "#ef4444" : tone === "gold" ? "#c9a227" : tone === "blue" ? "#2563eb" : "#1f8a6e";

  return (
    <div className="space-y-6">
      <PageHeader
        title={ar ? c.name_ar : c.name_en} icon={BookOpen}
        subtitle={ar ? c.description_ar : c.description_en}
        actions={<Badge tone={tone}>{c.family}</Badge>}
      />

      <Card>
        <div className="font-semibold text-ink mb-1">{t("competencyDetail.requiredByLevel")}</div>
        <p className="text-xs text-ink-muted mb-3">{t("competencyDetail.calibratedNote")}</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chart} margin={{ left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f1" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 5]} allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: "#f1f5f4" }} />
            <Bar dataKey="required" radius={[6, 6, 0, 0]} barSize={46}>
              {chart.map((_, i) => <Cell key={i} fill={barColor} fillOpacity={0.55 + i * 0.09} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="font-semibold text-ink mb-3 flex items-center gap-2"><Layers size={16} className="text-petro" /> {t("competencyDetail.calibration")}</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-ink-muted border-b border-slate-100">
                <th className="py-2 text-start font-medium">{t("competencyDetail.level")}</th>
                <th className="py-2 text-start font-medium">{t("profiles.required")}</th>
                <th className="py-2 text-start font-medium">{t("competencyDetail.experience")}</th>
                <th className="py-2 text-start font-medium">{t("competencyDetail.risk")}</th>
              </tr>
            </thead>
            <tbody>
              {(reqs.data ?? []).map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0">
                  <td className="py-2.5">{levelName(r.admin_level)}</td>
                  <td className="py-2.5 font-semibold text-ink">{r.required_level}</td>
                  <td className="py-2.5 text-ink-soft">{r.min_experience_band}</td>
                  <td className="py-2.5">{r.risk_weight >= 2 ? <Badge tone="red">×{r.risk_weight}</Badge> : <Badge tone="slate">×{r.risk_weight}</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div className="font-semibold text-ink mb-3">{t("competencies.bands")}</div>
          <ol className="relative border-s-2 border-slate-100 ms-2 space-y-3">
            {fam.data.proficiency_bands.map((b, i) => (
              <li key={b.band} className="ms-4">
                <span className="absolute -start-[7px] w-3 h-3 rounded-full bg-petro" style={{ opacity: 0.4 + i * 0.14 }} />
                <div className="text-sm text-ink font-medium">{ar ? b.ar : b.band.replace("_", " ")}</div>
                <div className="text-xs text-ink-muted">{t("competencyDetail.years")}: {b.range}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
