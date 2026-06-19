import { signIn } from "@/lib/auth";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/app/portfolio",
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="font-serif text-3xl text-ink">Client login</h1>
      <p className="mt-2 text-sm text-muted">
        Access your private portfolio and requests.
      </p>

      <form action={login} className="mt-8 grid gap-4">
        <label className="grid gap-2 text-sm text-muted">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-xl border border-white/10 bg-panel px-4 py-3 text-ink outline-none focus:border-gold"
          />
        </label>
        <label className="grid gap-2 text-sm text-muted">
          Password
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="rounded-xl border border-white/10 bg-panel px-4 py-3 text-ink outline-none focus:border-gold"
          />
        </label>
        <button
          type="submit"
          className="mt-2 rounded-full bg-gradient-to-r from-gold to-gold2 px-6 py-3 font-medium text-[#190a02]"
        >
          Sign in
        </button>
      </form>

      <p className="mt-6 text-xs text-muted">
        Demo accounts are created by <code>npm run db:seed</code>. OAuth and
        magic-link sign-in arrive in a later phase.
      </p>
    </main>
  );
}
