import { Info, ListChecks, Sigma, Workflow } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface MeasureRow { label: string; value: string; }

/**
 * The "i" affordance shown next to a page title. Hovering (or focusing) reveals
 * a popover with the full bilingual explainer: what it measures, the process,
 * how it's measured, and what happens next. Clicking pins it open. Content
 * lives in i18n under `method.modules.<module>`.
 */
export default function MethodInfo({ module, tone = "default" }: {
  module: string; tone?: "default" | "onDark";
}) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const show = hover || pinned;

  useEffect(() => {
    if (!pinned) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setPinned(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPinned(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned]);

  const base = `method.modules.${module}`;
  const what = t(`${base}.what`);
  const process = t(`${base}.process`, { returnObjects: true }) as string[];
  const measure = t(`${base}.measure`, { returnObjects: true }) as MeasureRow[];
  const next = t(`${base}.next`, { returnObjects: true }) as string[];

  return (
    <div
      ref={ref}
      className="relative inline-flex align-middle"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={() => setPinned((p) => !p)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        aria-label={t("method.show")}
        aria-expanded={show}
        className={`grid place-items-center w-6 h-6 rounded-full transition-colors ${
          tone === "onDark"
            ? "text-white/75 hover:text-white hover:bg-white/15"
            : "text-petro/70 hover:text-petro hover:bg-petro/10"
        }`}
      >
        <Info size={17} />
      </button>

      {show && (
        <div
          role="dialog"
          className="absolute top-full mt-2 start-0 z-50 w-[min(92vw,26rem)] max-h-[72vh] overflow-y-auto
                     card shadow-lift border-petro/15 text-start cursor-default animate-fade-in space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-petro/10 text-petro">
              <Info size={15} />
            </span>
            <span className="font-semibold text-ink text-sm">{t("method.show")}</span>
          </div>

          <p className="text-sm text-ink-soft leading-relaxed">
            <span className="font-semibold text-ink">{t("method.whatTitle")}: </span>{what}
          </p>

          <section>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink mb-2">
              <Workflow size={14} className="text-petro" /> {t("method.processTitle")}
            </div>
            <ol className="space-y-1.5">
              {process.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-soft">
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-petro text-white text-[10px] font-bold shrink-0 mt-0.5 tabular-nums">{i + 1}</span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink mb-2">
              <Sigma size={14} className="text-petro" /> {t("method.measureTitle")}
            </div>
            <dl className="space-y-1.5">
              {measure.map((m, i) => (
                <div key={i} className="rounded-lg border border-slate-100 bg-white/60 px-2.5 py-1.5">
                  <dt className="text-xs font-semibold text-petro">{m.label}</dt>
                  <dd className="text-xs text-ink-soft mt-0.5 leading-snug font-mono">{m.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink mb-2">
              <ListChecks size={14} className="text-petro" /> {t("method.nextTitle")}
            </div>
            <ul className="space-y-1">
              {next.map((n, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-soft">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-petro shrink-0" />
                  <span className="leading-snug">{n}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
