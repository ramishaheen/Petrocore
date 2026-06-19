import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";

function money(n: number | null, ccy = "USD") {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n);
}

export default async function PortfolioPage() {
  const client = await requireClient();
  if (!client) redirect("/login");

  const watches = await prisma.watch.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: "desc" },
    // Note: serialNumber is deliberately not selected for display.
    select: {
      id: true, brand: true, model: true, reference: true, year: true,
      purchasePrice: true, purchaseCurrency: true, status: true, location: true,
    },
  });

  const cost = watches.reduce((s, w) => s + (w.purchasePrice ?? 0), 0);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-gold2">Private portfolio</p>
          <h1 className="mt-2 font-serif text-4xl text-ink">Your collection</h1>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-muted">Cost basis</div>
          <div className="font-serif text-2xl text-ink">{money(cost)}</div>
        </div>
      </header>

      {watches.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-panel p-10 text-center text-muted">
          No watches yet. Add your first piece via <code>POST /api/portfolio/watches</code>
          {" "}(a UI form ships in Phase&nbsp;3).
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-panel text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-4 text-left">Brand &amp; model</th>
                <th className="px-5 py-4 text-left">Reference</th>
                <th className="px-5 py-4 text-left">Year</th>
                <th className="px-5 py-4 text-left">Cost</th>
                <th className="px-5 py-4 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {watches.map((w) => (
                <tr key={w.id} className="border-t border-white/10">
                  <td className="px-5 py-4 font-medium">{w.brand}<span className="block text-muted">{w.model}</span></td>
                  <td className="px-5 py-4">{w.reference ?? "—"}</td>
                  <td className="px-5 py-4">{w.year ?? "—"}</td>
                  <td className="px-5 py-4">{money(w.purchasePrice, w.purchaseCurrency ?? "USD")}</td>
                  <td className="px-5 py-4 text-gold2">{w.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-muted">
        Estimated values are not guaranteed returns. Serial numbers are stored
        securely and never shown in lists.
      </p>
    </main>
  );
}
