import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../lib/api";

interface Notif { id: string; kind: string; title_en: string; title_ar: string; body_en: string; body_ar: string; when: string; read: boolean; }

export default function NotificationBell() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === "ar";
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery<Notif[]>({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications/mine")).data,
    refetchInterval: 5000,
  });
  const notifs = data ?? [];
  const unread = notifs.filter((n) => !n.read).length;

  const markRead = useMutation({
    mutationFn: async (id: string) => api.post(`/notifications/${id}/read`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
  const markAll = useMutation({
    mutationFn: async () => api.post("/notifications/read-all"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:bg-slate-100 transition-colors"
        aria-label={t("notif.title")}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-[min(92vw,22rem)] max-h-[70vh] overflow-y-auto card shadow-lift z-50 p-0 animate-fade-in text-start">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 sticky top-0 bg-white">
            <span className="font-semibold text-ink text-sm">{t("notif.title")}</span>
            {unread > 0 && (
              <button onClick={() => markAll.mutate()} className="text-xs text-petro hover:underline flex items-center gap-1">
                <CheckCheck size={13} /> {t("notif.markAll")}
              </button>
            )}
          </div>
          {notifs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-muted">{t("notif.empty")}</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {notifs.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => !n.read && markRead.mutate(n.id)}
                    className={`w-full text-start px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors ${n.read ? "" : "bg-petro/5"}`}
                  >
                    <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-petro"}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-ink">{ar ? n.title_ar : n.title_en}</span>
                      <span className="block text-xs text-ink-soft mt-0.5">{ar ? n.body_ar : n.body_en}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
