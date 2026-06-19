import { ChevronDown, Info, ListChecks, Sigma, Workflow } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface MeasureRow { label: string; value: string; }

/**
 * Reusable, bilingual "How it works · How it's measured · What to do" explainer.
 * Content lives in i18n under `method.modules.<module>` so every string is
 * translatable. Drop it at the top of a page with the matching module key.
 */
export default function MethodPanel({ module, defaultOpen = true }: {
  module: string; defaultOpen?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);

  const base = `method.modules.${module}`;
  const what = t(`${base}.what`);
  const process = t(`${base}.process`, { returnObjects: true }) as string[];
  const measure = t(`${base}.measure`, { returnObjects: true }) as MeasureRow[];
  const next = t(`${base}.next`, { returnObjects: true }) as string[];

  return (
    <div className="card border-petro/15 bg-gradient-to-br from-petro/[0.04] to-transparent animate-slide-up">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 text-start"
        aria-expanded={open}
      >
        <span className="grid place-items-center w-8 h-8 rounded-xl bg-petro/10 text-petro shrink-0">
          <Info size={16} />
        </span>
        <span className="font-semibold text-ink flex-1">{t("method.show")}</span>
        <ChevronDown
          size={18}
          className={`text-ink-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-4 grid gap-5 md:grid-cols-2 animate-fade-in">
          {/* What this measures — spans both columns */}
          <p className="md:col-span-2 text-sm text-ink-soft leading-relaxed">
            <span className="font-semibold text-ink">{t("method.whatTitle")}: </span>
            {what}
          </p>

          {/* Process — numbered steps */}
          <section>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink mb-2">
              <Workflow size={15} className="text-petro" /> {t("method.processTitle")}
            </div>
            <ol className="space-y-2">
              {process.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-ink-soft">
                  <span className="grid place-items-center w-5 h-5 rounded-full bg-petro text-white text-[11px] font-bold shrink-0 mt-0.5 tabular-nums">
                    {i + 1}
                  </span>
                  <span className="leading-snug">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* How it's measured — label/value rows */}
          <section>
            <div className="flex items-center gap-2 text-sm font-semibold text-ink mb-2">
              <Sigma size={15} className="text-petro" /> {t("method.measureTitle")}
            </div>
            <dl className="space-y-2">
              {measure.map((m, i) => (
                <div key={i} className="rounded-xl border border-slate-100 bg-white/60 px-3 py-2">
                  <dt className="text-xs font-semibold text-petro">{m.label}</dt>
                  <dd className="text-xs text-ink-soft mt-0.5 leading-snug font-mono">{m.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* What happens next — spans both columns */}
          <section className="md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink mb-2">
              <ListChecks size={15} className="text-petro" /> {t("method.nextTitle")}
            </div>
            <ul className="space-y-1.5">
              {next.map((n, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink-soft">
                  <span className="text-petro mt-1.5 w-1.5 h-1.5 rounded-full bg-petro shrink-0" />
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
