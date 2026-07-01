import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { STATUS_LABEL, KIND_LABEL, nextStatus } from "@/lib/requests";
import type { RequestStatus } from "@prisma/client";

export default async function AdminRequestsPage() {
  const session = await auth();
  if (!session?.user || !isStaff(session.user.role)) return null; // layout guards too

  const requests = await prisma.request.findMany({
    orderBy: { updatedAt: "desc" },
    include: { client: { include: { user: { select: { email: true, name: true } } } } },
  });

  async function act(formData: FormData) {
    "use server";
    const s = await auth();
    if (!s?.user || !isStaff(s.user.role)) return;

    const id = String(formData.get("id"));
    const action = String(formData.get("action"));
    const r = await prisma.request.findUnique({ where: { id } });
    if (!r) return;

    let status: RequestStatus = r.status;
    if (action === "advance") status = nextStatus(r.status) ?? r.status;
    else if (action === "pause") status = "PAUSED";
    else if (action === "resume") status = "QUALIFICATION";
    else if (action === "close") status = "CLOSED";

    await prisma.request.update({ where: { id }, data: { status, assignedToId: s.user.id } });
    await prisma.auditLog.create({
      data: { userId: s.user.id, action: `request.${action}`, entity: "Request", entityId: id },
    });
    revalidatePath("/admin/requests");
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-serif text-3xl text-ink">Client requests</h1>
      <p className="mt-2 text-sm text-muted">Advance through the sourcing pipeline, or pause/close.</p>

      <div className="mt-8 grid gap-3">
        {requests.length === 0 ? (
          <p className="text-muted">No requests yet.</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-panel px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-ink">
                    {KIND_LABEL[r.kind]}
                    {r.brand ? ` · ${r.brand}` : ""}{r.model ? ` ${r.model}` : ""}
                  </div>
                  <div className="text-xs text-muted">
                    {r.client?.user?.email ?? "—"} · opened {r.createdAt.toISOString().slice(0, 10)}
                  </div>
                </div>
                <span className="rounded-full border border-gold/40 px-3 py-1 text-xs text-gold2">
                  {STATUS_LABEL[r.status]}
                </span>
              </div>

              <form action={act} className="mt-4 flex flex-wrap gap-2">
                <input type="hidden" name="id" value={r.id} />
                <button name="action" value="advance" className="rounded-full bg-gradient-to-r from-gold to-gold2 px-4 py-1.5 text-xs font-medium text-[#190a02]">
                  Advance →
                </button>
                <button name="action" value="pause" className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-ink">Pause</button>
                <button name="action" value="resume" className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-ink">Resume</button>
                <button name="action" value="close" className="rounded-full border border-white/15 px-4 py-1.5 text-xs text-ink">Close</button>
              </form>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
