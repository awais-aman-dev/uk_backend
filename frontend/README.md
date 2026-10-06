# 1Theory — frontend

Nuxt 4 app for the UK theory-test platform: landing page, sign-up / login, Stripe checkout, the student
account and the learning area (`/learn`). Accounts, packages, payments and access live in the **Django
backend**; this app talks to it through its own small server layer.

## Run it

```bash
pnpm install
NUXT_DJANGO_API_URL=http://localhost:8000 pnpm dev --port 3000
```

| Variable | Default | What |
|---|---|---|
| `NUXT_DJANGO_API_URL` | `http://localhost:8000` | The Django API, e.g. `https://uk-backend-xzbf.onrender.com` |
| `DATABASE_URL` | — | Postgres for the learning area (see below). **Required when deployed** (serverless has no disk); unset locally → embedded PGlite in `.data/pglite` |

The database migrates itself at start-up (`server/utils/migrate.ts`). After changing `server/db/schema.ts`, run
`pnpm db:generate` and commit the new migration — never `drizzle-kit migrate` against the database.

The Django side needs `FRONTEND_BASE_URL` pointing at this app (Stripe return URLs and email links use it).

## How it talks to Django

```
browser ──(cookies)──▶ Nuxt server (/api/*) ──(Bearer JWT)──▶ Django (/api/*)
```

- **Tokens never reach the browser.** Login / sign-up store Django's access + refresh tokens in httpOnly cookies
  (`dj_at`, `dj_rt`). The server attaches `Authorization: Bearer`, refreshes the 5-minute access token on
  expiry (Django rotates refresh tokens; parallel refreshes share one call) and signs out when refresh fails.
  No CORS needed — the browser only calls this app.
- **The visitor's IP is forwarded** (`X-Forwarded-For`), so Django's per-IP rate limits and login lockouts
  apply per visitor, not to this server. On Vercel the header is set by Vercel itself, so it can't be spoofed.
- **Errors** from DRF (`{"field": ["msg"]}` / `{"detail": "msg"}`) are turned into `data.fieldErrors`, which
  the forms show next to each field. 429 → "Too many attempts. Please try again in N seconds."
- Code: `server/utils/django.ts` (client, tokens, errors), `server/utils/session.ts` (current user, access).

| Frontend | Django |
|---|---|
| `/api/auth/register`, `login`, `logout` | `auth/register/`, `auth/login/` (`remember_me`), `auth/logout/` |
| `/api/auth/password/forgot`, `reset` | `auth/password/reset/`, `auth/password/reset/confirm/` |
| `/api/auth/verify-email` | `auth/email/verify/`, `cabinet/email/change/confirm/` |
| `/api/packages` | `packages/` |
| `/api/checkout` | `payments/checkout/` (with the signed-in user's email) |
| `/api/checkout/orders/:id` | `payments/orders/<uuid>/` (answered only to the order's owner) |
| `/api/account`, `/api/account/*` | `cabinet/profile/`, `cabinet/subscription/`, `cabinet/password/change/`, `cabinet/email/change/`, `auth/email/verify/resend/` |

### Pages Django links to

| Route | From |
|---|---|
| `/payment/success?order_id=…` | Stripe after paying — polls the order until the webhook marks it paid |
| `/checkout?order_id=…&cancelled=1` | Stripe "back" link |
| `/auth/verify-email?token=…` | Sign-up confirmation email |
| `/auth/reset-password?token=…` | Password reset, and "set your password" after a guest purchase |
| `/account/email/confirm?token=…` | Email-change confirmation |

## Learning area (temporary)

Lessons, practice, mock tests, hazard perception, e-book and progress still run on this app's own API
(`server/api/learn/*`, content seeded from `server/content/*`) until the Django learning API exists — it will
follow `docs/openapi.yaml`, so the pages switch over without changes. Meanwhile:

- **access** comes from Django (`cabinet/subscription/` → `online_platform_activated`);
- **progress** is stored here, in a learner row linked to the Django account (`users.django_id`);
- **study time** (Progress page) comes from a once-a-minute heartbeat of an open tab, which also keeps the
  Django session fresh.

The **contact form** also saves to this database for now — nobody reads it here; it should move to a
Django endpoint (or email).

## Resilience

- Django unreachable → the landing page still renders; sign-in / pricing show "service unavailable".
  Calls time out after 50 s (a sleeping free Render instance takes up to a minute to wake).
- Packages are cached for 1 minute, profile / access for 20 s (keyed by the verified access token).
- Parallel requests with an expired access token share one refresh; an API call never deletes the cookies
  (a losing race must not sign the user out) — only a page load does, when the session is really gone.

## Checks

```bash
pnpm typecheck
```

End-to-end was verified against the Django backend (branch `feature/subscriptions-cabinet`) running locally
with stripe-mock and a signed test webhook: sign-up → package → Stripe → webhook → access → learning;
profile, password change, token refresh, logout/login, email verification, password reset, rate limits.

## Notes for the backend

- **Celery worker is required** in every deployed environment: access after payment is granted by the
  `fulfil_order` task. Without a worker, paid orders give no access.
- `X-Forwarded-For`: `client_ip()` trusts the *first* entry, which a client can set — rotating it bypasses
  login lockout and throttles when Django is called directly. Behind Render's proxy, trust the hop Render adds.
- `GET /api/payments/orders/<uuid>/` is public and returns the buyer's email. The UUID ends up in the Stripe
  return URL (history, logs). Consider requiring the owner or dropping the email.
- Still needed by the frontend: a list of the user's orders (order history in the account).
- Packages must exist in Django Admin (Weekly £5 / 7 days, Monthly £15 / 30 days, 3 Months £25 / 90 days);
  with none, the pricing section says "Plans are being updated".
- Set `FRONTEND_BASE_URL` to the deployed frontend, or Stripe returns and email links go to localhost.
- Free Render instances sleep after inactivity; the first request then takes ~60 s.
