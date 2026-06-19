# HORO PRIVÉ — Platform (Phase 1 scaffold)

The client-facing marketing site lives in `apps/web` (static, already in production).
This package (`apps/platform`) is the **application**: secure collector accounts,
consultations, sourcing requests, portfolio intelligence, and the admin/consultant
back office.

> **Status: Phase 1 — foundation.** This is a runnable scaffold (Next.js + Prisma +
> Auth.js) with the core data model and two working vertical slices
> (consultation intake → DB, and a protected collector portfolio). It is **not** a
> finished product; features that need third-party credentials are stubbed and
> clearly marked. Do not point real client data at it until Phase 7 (security) is done.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript |
| DB | PostgreSQL |
| ORM | Prisma |
| Auth | Auth.js (NextAuth v5) — credentials now; add OAuth/email later |
| Styling | Tailwind CSS |
| Validation | Zod |
| Hosting | Vercel (separate project, root `apps/platform`) |

## Architecture (high level)

```
Browser ──▶ Next.js (App Router)
              ├─ Route handlers (/api/*)  ── Zod validation ── Prisma ──▶ PostgreSQL
              ├─ Server Components (read)  ── auth() session guard
              └─ middleware.ts             ── route protection + RBAC
```

- **Roles** (`Role` enum): CLIENT, CONSULTANT, SOURCING, PORTFOLIO_MGR,
  VERIFIER, CONTENT, SUPPORT, FINANCE, AUDITOR, SUPER_ADMIN.
- **Tenancy/privacy:** every client-owned record is scoped by `clientId`; server
  code must filter by the session's client. Serial numbers / documents are never
  returned to the client list endpoints.

## Getting started

```bash
cd apps/platform
cp .env.example .env          # then fill in the values
npm install
npx prisma migrate dev --name init
npm run dev                   # http://localhost:3000
```

## Required credentials / env (set in .env and Vercel)

| Var | What it's for | Needed for |
| --- | --- | --- |
| `DATABASE_URL` | Postgres connection (Neon/Supabase/RDS) | everything |
| `AUTH_SECRET` | Auth.js session signing (`openssl rand -base64 32`) | auth |
| `AUTH_URL` | Canonical app URL | auth in prod |
| `EMAIL_SERVER` / `EMAIL_FROM` | Magic-link + notifications | email auth, alerts |
| `STORAGE_*` | Object storage for the documents vault (S3/R2) | documents |
| `MARKET_DATA_API_KEY` | Valuation comparables feed | real valuations |
| `FX_API_KEY` | Currency rates for the deal calculator | landed cost |
| `WHATSAPP_*`, `CALENDAR_*`, `STRIPE_*` | Concierge / booking / payments | later phases |

Anything above that is unset → the related feature runs in a clearly-labelled
"not configured" state rather than failing.

## Roadmap

- **Phase 1 (this):** schema, auth, RBAC, consultation intake, portfolio read/write.
- **Phase 2:** sourcing requests + rare mandates + request status workflow.
- **Phase 3:** portfolio analytics, valuation history, service reminders, documents vault.
- **Phase 4:** opportunities + comparison + landed-cost calculator (live FX/market data).
- **Phase 5:** admin/consultant dashboard + role management + audit log.
- **Phase 6:** payments/memberships, appointment booking, WhatsApp concierge.
- **Phase 7:** security hardening (MFA, signed URLs, rate limiting, OWASP), a11y, SEO, analytics.
- **Phase 8:** staging → production deploy.

See `prisma/schema.prisma` for the full domain model.
