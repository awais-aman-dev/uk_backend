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

## Learning area

The learning area runs on the Django **Learning API** (`/api/learn/*`, as in the backend's *Learning API —
Frontend Integration Guide*). Our server (`server/api/learn/*`) proxies it with the learner's JWT and only adapts
shapes; Django checks answers and scores everything. The switch is automatic
(`server/utils/django-learn.ts`): as soon as `GET /api/learn/topics/` returns a topic, every learning page uses
Django — until then the app serves its own material (`server/content/*`), so the area is never empty. A failed
check (Render waking up) keeps the last answer.

In Django mode the pages show **only what the API offers** (guide flows A–E):

| Page | Django endpoints |
|---|---|
| Today, Progress | `topics/` + `progress/` (`null` bests shown as "not yet", never 0) |
| Lessons, e-book | `lessons/{slug}/`, `ebook/`, `ebook/{slug}/`; finishing → `lessons/{slug}/complete/` (also for e-book sections). Blocks: `html` (sanitised), `check`, `video`, `document` (https only), `hazard`; unknown types are skipped |
| Practice | `practice/` (modes as the guide defines them), `answer/` (`{questionId, selected}` only), `questions/{key}/saved/` (POST / DELETE) |
| Exams (`/learn/mock` → `/learn/exams/{slug}`) | `exams/`, `exams/{slug}/`, `exams/{slug}/submit/` — FE timer, answers kept in the browser, one submit, auto-submit at zero |
| Hazard perception | `hazard/`, `hazard/{slug}/`, `hazard/{slug}/attempt/` — clicks in seconds, warning near `maxClicks`, voided message |
| Road signs | `signs/` — drawn from `spec`; a shape we can't draw shows the sign's name |

Status handling follows the guide: 401 → one token refresh, then sign-in; 402 → the "unlock" screen; 404 → not
found, no retry; 429 → back off and retry once. Signed media URLs are never stored; lesson and e-book pages
re-fetch every 50 minutes while open. Lesson responses come with `signs: {}` (a known issue in the guide), so
missing signs are filled from `signs/`. Not offered in Django mode: our readiness/plan, spaced repetition,
search (⌘K) and the e-book PDF.

Other learning data kept here: **access** comes from Django (`cabinet/subscription/`); **study time** comes from
a once-a-minute heartbeat of an open tab (which also keeps the Django session fresh), stored against the
Django account (`users.django_id`).

The **contact form** also saves to this database for now — nobody reads it here; it should move to a
Django endpoint (or email).

## Resilience

- Django unreachable → the landing page still renders; sign-in / pricing show "service unavailable".
  Calls time out after 50 s (a sleeping free Render instance takes up to a minute to wake).
- Packages are cached for 1 minute, the profile for 20 s (keyed by the verified access token), an *active* plan
  for 20 s — "no plan / expired" is never cached, so access shows up right after a payment on any server instance.
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
