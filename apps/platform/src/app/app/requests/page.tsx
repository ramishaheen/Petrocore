import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireClient } from "@/lib/session";
import { STATUS_LABEL, KIND_LABEL } from "@/lib/requests";
import type { RequestKind } from "@prisma/client";

const KINDS: RequestKind[] = ["RECOMMENDATION", "EXACT_WATCH", "RARE_PIECE", "BEST_DEAL", "TRADE"];

export default async function RequestsPage() {
  const client = await requireClient();
  if (!client) return null; // layout already guards/redirects

  const requests = await prisma.request.findMany({
    where: { clientId: client.id },
    orderBy: { createdAt: "desc" },
  });

  async function createRequest(formData: FormData) {
    "use server";
    const c = await requireClient();
    if (!c) return;
    const kind = String(formData.get("kind") ?? "RECOMMENDATION") as RequestKind;
    await prisma.request.create({
      data: {
        clientId: c.id,
        kind: KINDS.includes(kind) ? kind : "RECOMMENDATION",
        brand: (formData.get("brand") as string) || null,
        model: (formData.get("model") as string) || null,
        deliveryCountry: (formData.get("country") as string) || null,
        notes: (formData.get("notes") as string) || null,
        status: "NEW",
      },
    });
    revalidatePath("/app/requests");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-serif text-3xl text-ink">Your requests</h1>
      <p className="mt-2 text-sm text-muted">
        Sourcing requests and rare-piece mandates. A consultant reviews each one and advances its status.
      </p>

      <form action={createRequest} className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-panel p-6">
        <h2 className="font-serif text-xl text-ink">New request</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-muted">
            What are you after?
            <select name="kind" className="rounded-xl border border-white/10 bg-bg px-4 py-3 text-ink">
              {KINDS.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm text-muted">
            Delivery country
            <input name="country" className="rounded-xl border border-white/10 bg-bg px-4 py-3 text-ink" />
          </label>
          <label className="grid gap-2 text-sm text-muted">
            Brand
            <input name="brand" placeholder="e.g. Rolex" className="rounded-xl border border-white/10 bg-bg px-4 py-3 text-ink" />
          </label>
          <label className="grid gap-2 text-sm text-muted">
            Model / reference
            <input name="model" placeholder="e.g. Daytona 126500LN" className="rounded-xl border border-white/10 bg-bg px-4 py-3 text-ink" />
          </label>
        </div>
        <label className="grid gap-2 text-sm text-muted">
          Notes
          <textarea name="notes" rows={3} className="rounded-xl border border-white/10 bg-bg px-4 py-3 text-ink" />
        </label>
        <button className="justify-self-start rounded-full bg-gradient-to-r from-gold to-gold2 px-6 py-3 font-medium text-[#190a02]">
          Submit request
        </button>
      </form>

      <div className="mt-10 grid gap-3">
        {requests.length === 0 ? (
          <p className="text-muted">No requests yet.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-panel px-5 py-4">
              <div>
                <div className="font-medium text-ink">
                  {KIND_LABEL[r.kind]}
                  {r.brand ? ` · ${r.brand}` : ""}{r.model ? ` ${r.model}` : ""}
                </div>
                <div className="text-xs text-muted">Opened {r.createdAt.toISOString().slice(0, 10)}</div>
              </div>
              <span className="rounded-full border border-gold/40 px-3 py-1 text-xs text-gold2">
                {STATUS_LABEL[r.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
