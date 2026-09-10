# PAYDER web (Next.js)

One Next.js app, three role-gated surfaces, talking to the NestJS backend
(`../backend`). See `PAYDER-ARCHITECTURE.md` (in the project docs) for the
full design; this README is just how to run it.

## Routes

- `/` — public landing, `/login` — shared login (redirects by role after auth)
- `/dashboard`, `/wallet`, `/bills`, `/airtime`, `/exams`, `/support` — customer portal
- `/admin`, `/admin/kyc`, `/admin/transactions`, `/admin/providers` — admin console
- `/care` — customer-care console

Role gating today is client-side only (`components/RoleGuard.tsx`, reading
the JWT's `role` claim) — a UX convenience, not a security boundary. The
NestJS backend's `RolesGuard` is what actually enforces this; never add logic
here that assumes the client-side gate is sufficient.

## Local setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Requires the backend running at the URL in `NEXT_PUBLIC_API_BASE_URL`
(defaults to `http://localhost:3000/api/v1`).

## What's real vs. stubbed

Every page here calls a real backend endpoint that exists in the NestJS
scaffold. Not yet built: registration/signup UI (backend endpoint exists,
form doesn't), wallet statement/transaction history view, admin overview
dashboard charts, and refresh-token handling on 401 (currently just fails the
request — see `lib/api-client.ts`).
