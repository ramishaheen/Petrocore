import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Plug, Settings as SettingsIcon, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge, Card, PageHeader, PageSkeleton } from "../components/ui";
import { api } from "../lib/api";

interface AIConfig { model: string; gateway_url: string; api_key_set: boolean; mode: "live" | "stub"; }
interface Connector {
  id: string; code: string; name_en: string; name_ar: string; system_type: string;
  direction: string; status: string; sync_mode: string; base_url?: string; api_key_set?: boolean;
  last_sync_at: string | null;
}
interface TestResult { ok: boolean; mode?: string; message: string; }

const STATUS_TONE: Record<string, "green" | "blue" | "slate" | "red"> = {
  ACTIVE: "green", CONFIGURED: "blue", PLANNED: "slate", DISABLED: "red",
};
const SYNC_MODES = ["MANUAL", "SCHEDULED", "REALTIME"];
const CONN_STATUSES = ["PLANNED", "CONFIGURED", "ACTIVE", "DISABLED"];

function TestPill({ result }: { result: TestResult }) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${result.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
      {result.ok ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" /> : <XCircle size={15} className="shrink-0 mt-0.5" />}
      <span><strong>{result.ok ? t("settings.testOk") : t("settings.testFail")}</strong> — {result.message}</span>
    </div>
  );
}

function field(label: string) {
  return "block text-xs font-medium text-ink-soft mb-1 " + label;
}

function AIGatewayCard() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: cfg } = useQuery<AIConfig>({
    queryKey: ["settings-ai"], queryFn: async () => (await api.get("/settings/ai")).data,
  });
  const [model, setModel] = useState("");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [test, setTest] = useState<TestResult | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    if (cfg) { setModel(cfg.model); setGatewayUrl(cfg.gateway_url); }
  }, [cfg]);

  const save = useMutation({
    mutationFn: async () => (await api.put("/settings/ai", { model, gateway_url: gatewayUrl, api_key: apiKey })).data as AIConfig,
    onSuccess: () => { setApiKey(""); setSavedMsg(true); qc.invalidateQueries({ queryKey: ["settings-ai"] }); },
  });
  const runTest = useMutation({
    mutationFn: async () => (await api.post("/settings/ai/test")).data as TestResult,
    onSuccess: (r) => setTest(r),
  });
  const saveAndTest = async () => { setSavedMsg(false); setTest(null); await save.mutateAsync(); await runTest.mutateAsync(); };

  if (!cfg) return <Card><div className="h-40 skeleton rounded-xl" /></Card>;
  const busy = save.isPending || runTest.isPending;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-petro/10 text-petro shrink-0"><SettingsIcon size={18} /></span>
          <div>
            <div className="font-semibold text-ink">{t("settings.aiGateway")}</div>
            <div className="text-xs text-ink-muted mt-0.5 max-w-md">{t("settings.aiGatewayHint")}</div>
          </div>
        </div>
        <Badge tone={cfg.mode === "live" ? "green" : "slate"}>
          {t("settings.mode")}: {cfg.mode === "live" ? t("settings.mode_live") : t("settings.mode_stub")}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        <label className={field("")}>{t("settings.model")}
          <input className="input mt-1" value={model} onChange={(e) => setModel(e.target.value)} />
        </label>
        <label className={field("")}>{t("settings.gatewayUrl")}
          <input className="input mt-1" value={gatewayUrl} onChange={(e) => setGatewayUrl(e.target.value)} dir="ltr" />
        </label>
        <label className={field("md:col-span-2")}>
          {t("settings.apiKey")} · <span className="text-ink-muted">{cfg.api_key_set ? t("settings.keySet") : t("settings.keyNotSet")}</span>
          <input className="input mt-1" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={t("settings.apiKeyPlaceholder")} dir="ltr" autoComplete="new-password" />
        </label>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button className="btn btn-primary" disabled={busy} onClick={saveAndTest}>
          {busy ? t("settings.saving") : t("settings.saveAndTest")}
        </button>
        <button className="btn-soft" disabled={busy} onClick={() => save.mutate()}>{t("settings.save")}</button>
        {savedMsg && !test && <span className="text-xs text-emerald-700">{t("settings.saved")}</span>}
      </div>
      {test && <div className="mt-3"><TestPill result={test} /></div>}
    </Card>
  );
}

function ConnectorCard({ c }: { c: Connector }) {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const qc = useQueryClient();
  const [baseUrl, setBaseUrl] = useState(c.base_url ?? "");
  const [apiKey, setApiKey] = useState("");
  const [syncMode, setSyncMode] = useState(c.sync_mode);
  const [status, setStatus] = useState(c.status);
  const [test, setTest] = useState<TestResult | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const save = useMutation({
    mutationFn: async () => (await api.put(`/integration/connectors/${c.code}`, {
      base_url: baseUrl, api_key: apiKey, sync_mode: syncMode, status,
    })).data as Connector,
    onSuccess: () => { setApiKey(""); setSavedMsg(true); qc.invalidateQueries({ queryKey: ["connectors"] }); },
  });
  const runTest = useMutation({
    mutationFn: async () => (await api.post(`/integration/connectors/${c.code}/test`)).data as TestResult,
    onSuccess: (r) => setTest(r),
  });
  const saveAndTest = async () => { setSavedMsg(false); setTest(null); await save.mutateAsync(); await runTest.mutateAsync(); };
  const busy = save.isPending || runTest.isPending;

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="chip bg-petro/10 text-petro">{c.system_type}</span>
            <Badge tone={STATUS_TONE[status] ?? "slate"}>{t(`integrations.st_${status}`)}</Badge>
          </div>
          <div className="mt-1.5 font-semibold text-ink">{ar ? c.name_ar : c.name_en}</div>
          <div className="text-xs text-ink-muted mt-0.5 font-mono">{c.code} · {c.direction}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <label className={field("md:col-span-2")}>{t("settings.baseUrl")}
          <input className="input mt-1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
            placeholder={t("settings.baseUrlPlaceholder")} dir="ltr" />
        </label>
        <label className={field("md:col-span-2")}>
          {t("settings.apiKey")} · <span className="text-ink-muted">{c.api_key_set ? t("settings.keySet") : t("settings.keyNotSet")}</span>
          <input className="input mt-1" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
            placeholder={t("settings.apiKeyPlaceholder")} dir="ltr" autoComplete="new-password" />
        </label>
        <label className={field("")}>{t("settings.syncMode")}
          <select className="input mt-1" value={syncMode} onChange={(e) => setSyncMode(e.target.value)}>
            {SYNC_MODES.map((m) => <option key={m} value={m}>{t(`settings.sm_${m}`)}</option>)}
          </select>
        </label>
        <label className={field("")}>{t("settings.status")}
          <select className="input mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
            {CONN_STATUSES.map((s) => <option key={s} value={s}>{t(`integrations.st_${s}`)}</option>)}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button className="btn btn-primary text-sm" disabled={busy} onClick={saveAndTest}>
          {busy ? t("settings.saving") : t("settings.saveAndTest")}
        </button>
        <button className="btn-soft text-sm" disabled={busy} onClick={() => save.mutate()}>{t("settings.save")}</button>
        {savedMsg && !test && <span className="text-xs text-emerald-700">{t("settings.saved")}</span>}
      </div>
      {test && <div className="mt-3"><TestPill result={test} /></div>}
    </Card>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { data: connectors, isLoading } = useQuery<Connector[]>({
    queryKey: ["connectors"], queryFn: async () => (await api.get("/integration/connectors")).data,
  });
  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader title={t("settings.title")} subtitle={t("settings.subtitle")} icon={SettingsIcon} />

      <AIGatewayCard />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <Plug size={16} className="text-petro" />
          <h2 className="font-semibold text-ink">{t("settings.connections")}</h2>
        </div>
        <p className="text-xs text-ink-muted mb-4">{t("settings.connectionsHint")}</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {(connectors ?? []).map((c) => <ConnectorCard key={c.id} c={c} />)}
        </div>
      </div>
    </div>
  );
}
