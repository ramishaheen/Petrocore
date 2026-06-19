import { useQuery } from "@tanstack/react-query";
import {
  Award, BookOpen, CheckCircle2, Clock, Dumbbell, GraduationCap, Rocket, Sparkles, Target, TrendingUp,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer,
} from "recharts";

import MethodInfo from "../components/MethodInfo";
import { Badge, Card, PageSkeleton, ProgressRing } from "../components/ui";
import { api } from "../lib/api";

interface Result {
  competency_en: string; competency_ar: string; assessed_level: number; required_level: number; status: string;
}
interface Detail {
  id: string; name_en: string; name_ar: string; job_en?: string; job_ar?: string;
  readiness_index: number; status: string; competency_results: Result[];
  certificates?: { en: string; ar: string; year: number }[];
  training?: { en: string; ar: string; stage: string; closure: number }[];
  activity?: { en: string; ar: string; when: string }[];
}
interface ProfileRow { id: string; }

function rank(v: number) {
  if (v >= 85) return { en: "Expert / Coach", ar: "خبير / مُرشد", tone: "green" as const };
  if (v >= 70) return { en: "Advanced", ar: "متقدم", tone: "blue" as const };
  if (v >= 50) return { en: "Independent", ar: "ممارس مستقل", tone: "amber" as const };
  return { en: "Developing", ar: "قيد التطوير", tone: "slate" as const };
}

const PATH = [
  { key: "Learn", icon: BookOpen },
  { key: "Practice", icon: Dumbbell },
  { key: "Apply", icon: Target },
  { key: "Excel", icon: Rocket },
];

export default function MyWorkspace() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";

  const list = useQuery<ProfileRow[]>({ queryKey: ["profiles"], queryFn: async () => (await api.get("/profiles")).data });
  const meId = list.data?.[0]?.id;
  const me = useQuery<Detail>({
    queryKey: ["profile", meId], enabled: !!meId,
    queryFn: async () => (await api.get(`/profiles/${meId}`)).data,
  });

  if (list.isLoading || me.isLoading || !me.data) return <PageSkeleton />;
  const d = me.data;
  const r = rank(d.readiness_index);
  const step = d.readiness_index >= 85 ? 3 : d.readiness_index >= 70 ? 2 : d.readiness_index >= 50 ? 1 : 0;

  const radar = d.competency_results.map((c) => ({
    name: (ar ? c.competency_ar : c.competency_en).split(" ")[0],
    value: Math.round((c.assessed_level / (c.required_level || 5)) * 100),
  }));
  const focus = d.competency_results.filter((c) => c.assessed_level < c.required_level);
  const strong = d.competency_results.filter((c) => c.assessed_level >= c.required_level);
  const achievements = [
    ...(d.status === "TRUSTED" ? [{ en: "Trusted Profile", ar: "بروفايل موثوق" }] : []),
    ...strong.slice(0, 3).map((c) => ({ en: `Strong: ${c.competency_en}`, ar: `متميز: ${c.competency_ar}` })),
    ...(d.readiness_index >= 70 ? [{ en: "Readiness 70+", ar: "جاهزية +70" }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="bg-petro-grad text-white border-0 overflow-hidden relative animate-slide-up">
        <div className="absolute inset-0 bg-petro-mesh opacity-50" />
        <div className="relative flex flex-col md:flex-row items-center gap-6">
          <div className="bg-white rounded-full p-3 shadow-lift shrink-0">
            <ProgressRing value={d.readiness_index} label={t("common.readiness")} />
          </div>
          <div className="flex-1 text-center md:text-start">
            <div className="flex items-center justify-center md:justify-start gap-1.5 text-white/70 text-sm">
              {t("workspace.greeting")}
              <MethodInfo module="workspace" tone="onDark" />
            </div>
            <h1 className="text-2xl font-bold">{ar ? d.name_ar : d.name_en}</h1>
            <div className="text-white/70 text-sm">{ar ? d.job_ar : d.job_en}</div>
            <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="chip bg-white/15 text-white"><Sparkles size={12} /> {ar ? r.ar : r.en}</span>
              <span className="chip bg-white/15 text-white">{t(`profiles.status_${d.status}`)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Development path stepper */}
      <Card className="animate-slide-up">
        <div className="font-semibold text-ink mb-4">{t("workspace.developmentPath")}</div>
        <div className="flex items-center">
          {PATH.map((s, i) => {
            const done = i <= step;
            const Icon = s.icon;
            return (
              <div key={s.key} className="flex-1 flex items-center">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <span className={`grid place-items-center w-11 h-11 rounded-2xl ${done ? "bg-petro text-white shadow-lift" : "bg-slate-100 text-ink-muted"}`}>
                    <Icon size={20} />
                  </span>
                  <span className={`text-xs ${done ? "text-petro font-medium" : "text-ink-muted"}`}>{t(`workspace.path${s.key}`)}</span>
                </div>
                {i < PATH.length - 1 && <div className={`flex-1 h-1 mx-2 rounded-full ${i < step ? "bg-petro" : "bg-slate-100"}`} />}
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competency radar */}
        <Card className="animate-slide-up">
          <div className="font-semibold text-ink mb-2 flex items-center gap-2"><TrendingUp size={16} className="text-petro" /> {t("workspace.competencyProfile")}</div>
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radar} outerRadius="70%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} />
              <Radar dataKey="value" stroke="#0d5c4a" fill="#1f8a6e" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>

        {/* Recommended actions */}
        <Card className="animate-slide-up">
          <div className="font-semibold text-ink mb-3 flex items-center gap-2"><Target size={16} className="text-petro" /> {t("workspace.recommended")}</div>
          {focus.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm"><CheckCircle2 size={18} /> {t("workspace.allMet")}</div>
          ) : (
            <div className="space-y-2">
              {focus.map((c, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2">
                  <Badge tone="amber">{c.assessed_level} → {c.required_level}</Badge>
                  <span className="text-sm text-ink flex-1">{ar ? c.competency_ar : c.competency_en}</span>
                  <span className="text-xs text-petro">{t("workspace.startLearning")}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Training + certificates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="animate-slide-up">
          <div className="font-semibold text-ink mb-3 flex items-center gap-2"><GraduationCap size={16} className="text-petro" /> {t("workspace.myTraining")}</div>
          <div className="space-y-3">
            {(d.training ?? []).map((tr, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-ink">{ar ? tr.ar : tr.en}</span>
                  <Badge tone={tr.stage === "AFTER" ? "green" : tr.stage === "DURING" ? "amber" : "slate"}>{t(`workspace.stage_${tr.stage}`)}</Badge>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-petro" style={{ width: `${tr.closure}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="text-xs text-ink-muted mb-2">{t("workspace.certificates")}</div>
            <div className="flex flex-wrap gap-2">
              {(d.certificates ?? []).map((c, i) => <Badge key={i} tone="blue">{ar ? c.ar : c.en} · {c.year}</Badge>)}
            </div>
          </div>
        </Card>

        <Card className="animate-slide-up">
          <div className="font-semibold text-ink mb-3 flex items-center gap-2"><Clock size={16} className="text-petro" /> {t("workspace.activity")}</div>
          <ol className="relative border-s border-slate-100 ms-1.5 space-y-4">
            {(d.activity ?? []).map((a, i) => (
              <li key={i} className="ms-4">
                <span className="absolute -start-1.5 w-3 h-3 rounded-full bg-petro" />
                <div className="text-sm text-ink">{ar ? a.ar : a.en}</div>
                <div className="text-xs text-ink-muted">{a.when}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {/* Achievements */}
      <Card className="animate-slide-up">
        <div className="font-semibold text-ink mb-3 flex items-center gap-2"><Award size={16} className="text-petro-gold" /> {t("workspace.achievements")}</div>
        <div className="flex flex-wrap gap-2">
          {achievements.length === 0 ? <span className="text-sm text-ink-muted">—</span> :
            achievements.map((a, i) => <Badge key={i} tone="gold" icon={Award}>{ar ? a.ar : a.en}</Badge>)}
        </div>
      </Card>
    </div>
  );
}
