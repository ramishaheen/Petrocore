import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user || !isStaff(session.user.role)) redirect("/login");

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div>
      <header className="flex items-center justify-between border-b border-gold/20 bg-panel px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="font-serif text-lg text-ink">HORO&nbsp;PRIVÉ</span>
          <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs uppercase tracking-wider text-gold2">Back office</span>
        </div>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/admin/requests" className="text-muted hover:text-ink">Requests</Link>
          <Link href="/app/portfolio" className="text-muted hover:text-ink">Client view</Link>
          <span className="text-xs text-muted">{session.user.email} · {session.user.role}</span>
          <form action={doSignOut}>
            <button className="rounded-full border border-white/15 px-4 py-1.5 text-ink">Sign out</button>
          </form>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
