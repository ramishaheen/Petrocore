import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div>
      <header className="flex items-center justify-between border-b border-white/10 bg-panel px-6 py-4">
        <Link href="/app/portfolio" className="font-serif text-lg tracking-wide text-ink">
          HORO&nbsp;PRIVÉ
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/app/portfolio" className="text-muted hover:text-ink">Portfolio</Link>
          <Link href="/app/requests" className="text-muted hover:text-ink">Requests</Link>
          {isStaff(session.user.role) && (
            <Link href="/admin/requests" className="text-gold2 hover:text-ink">Admin</Link>
          )}
          <form action={doSignOut}>
            <button className="rounded-full border border-white/15 px-4 py-1.5 text-ink">Sign out</button>
          </form>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
