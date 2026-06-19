import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 px-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-gold2">Private Office</p>
        <h1 className="mt-4 font-serif text-5xl text-ink">HORO&nbsp;PRIVÉ</h1>
        <p className="mt-4 max-w-xl text-muted">
          The client application — secure collector accounts, consultations and
          portfolio intelligence. This is the Phase&nbsp;1 foundation; sign in to
          view a protected portfolio.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href="/login"
          className="rounded-full bg-gradient-to-r from-gold to-gold2 px-6 py-3 font-medium text-[#190a02]"
        >
          Client login
        </Link>
        <Link
          href="/app/portfolio"
          className="rounded-full border border-white/15 px-6 py-3 text-ink"
        >
          My portfolio
        </Link>
      </div>
      <p className="text-xs text-muted">
        Marketing site lives in <code>apps/web</code>. See <code>apps/platform/README.md</code>.
      </p>
    </main>
  );
}
