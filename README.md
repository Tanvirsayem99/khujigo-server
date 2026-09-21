# KhujiGo API

Backend for the **KhujiGo** Bangladeshi e-commerce platform (storefront + admin dashboard).
It replaces the frontend's in-memory `lib/mock-db.ts` and its `localStorage`-based fake auth with a
real, persistent, server-authoritative API.

**Stack:** NestJS 11 · PostgreSQL · Prisma 6 · TypeScript · Swagger

---

## Quick start

### 1. Prerequisites

- Node.js 20+ (developed on Node 26)
- A PostgreSQL 14+ database

### 2. Install

```bash
npm install --include=dev
```

> If your npm is configured with `omit=dev`, the `--include=dev` flag is required for the build,
> lint and test toolchain.

### 3. Configure

```bash
cp .env.example .env
```

Edit `DATABASE_URL`, then set real JWT secrets. Any of these work:

**Local PostgreSQL** (already running as a Windows service in this environment):

```
DATABASE_URL="postgresql://postgres:<password>@localhost:5432/khujigo?schema=public"
```

Create the database first:

```bash
psql -U postgres -h localhost -c "CREATE DATABASE khujigo;"
```

**Docker** (isolated Postgres on host port 5433):

```bash
docker compose up -d
# then use:
# DATABASE_URL="postgresql://khujigo:khujigo@localhost:5433/khujigo?schema=public"
```

**Supabase / any connection pooler** — needs **two** URLs, because a pooler in transaction
mode cannot run DDL:

```bash
# Runtime (the app): transaction pooler
DATABASE_URL="postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true"
# Migrations + seeding (the Prisma CLI): direct or session-mode connection
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/postgres"
```

`DIRECT_URL` is wired to `directUrl` in `prisma/schema.prisma`, so `prisma migrate` and
`prisma db seed` use it automatically. On local Postgres, point `DIRECT_URL` at the same URL as
`DATABASE_URL`. Forgetting `DIRECT_URL` (or pointing migrations at port 6543) fails with pooler
errors, and running them against an unmigrated database fails with `P2021: The table
'public.customers' does not exist`.

### 4. Migrate, seed and run

```bash
npm run prisma:migrate   # local dev: create + apply the schema
npm run prisma:seed      # load the demo catalog, orders, coupons and users
npm run start:dev        # http://localhost:4000/api/v1
```

On an **existing or hosted database** (Supabase, staging, production) use deploy instead — it
applies the pending migrations without prompting or resetting anything:

```bash
npm run prisma:deploy    # prisma migrate deploy
npm run prisma:seed
```

- API base URL: `http://localhost:4000/api/v1`
- **Swagger UI: `http://localhost:4000/docs`**

---

## Scripts

| Script | Purpose |
|---|---|
| `npm run start:dev` | Watch-mode dev server |
| `npm run build` / `npm run start:prod` | Production build and run |
| `npm run db:setup` | `migrate dev` + seed in one step |
| `npm run prisma:migrate` | Create/apply a migration (dev) |
| `npm run prisma:deploy` | Apply pending migrations to an existing DB (no prompts, no reset) |
| `npm run prisma:seed` | Re-seed (idempotent — wipes and reloads demo data) |
| `npm run prisma:reset` | Drop, re-migrate and re-seed |
| `npm run prisma:studio` | Browse the database |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint with `--fix` |
| `npm run test` | Unit tests |
| `npm run test:e2e` | End-to-end suite (needs a migrated + seeded DB) |

---

## Demo accounts

Seeded by `prisma/seed.ts`. Admin passwords are **not** committed to the repo: set
`SUPER_ADMIN_PASSWORD` / `ADMIN_PASSWORD` / `STAFF_PASSWORD` before seeding, or the seed
generates a random password and prints it once. Rotate an existing account any time with
`npm run admin:password` (see `.env.example`).

| Role | Email | Password |
|---|---|---|
| SUPER_ADMIN | `admin@khujigo.com` | `$SUPER_ADMIN_PASSWORD` (random if unset) |
| ADMIN | `manager@khujigo.com` | `$ADMIN_PASSWORD` (random if unset) |
| STAFF | `staff@khujigo.com` | `$STAFF_PASSWORD` (random if unset) |
| Customer | `customer@khujigo.com` (or `01712345678`) | `customer123` |

> Coupon windows are seeded as the absolute dates from the original demo data, so `EID2026`
> (expired 2026-04-30) is a ready-made example of the expiry check, while `KHUJIGO100` and
> `TRENDING50` run through 2026-12-31. If you demo this much later, re-seed or edit the dates.

---

## Project structure

```
prisma/
  schema.prisma          # 11 models + 8 enums
  seed.ts                # demo catalog, orders, coupons, users
src/
  main.ts                # global prefix, CORS, ValidationPipe, Swagger
  app.module.ts          # wires all modules + global guards/filters
  config/                # typed config + fail-fast env validation
  common/
    prisma/              # PrismaService (global module)
    guards/              # JwtAuthGuard (global), RolesGuard
    decorators/          # @Public, @OptionalAuth, @CustomerAuth, @AdminAuth, @Roles, @CurrentUser
    filters/             # Prisma error -> HTTP status mapping
    utils/               # scrypt password hashing, token hashing
  modules/
    auth/ products/ categories/ orders/ coupons/
    reviews/ banners/ delivery-settings/ analytics/ health/
test/
  app.e2e-spec.ts        # end-to-end coverage
```

Each domain module is a standard `module` + `controller` + `service` + `dto/` set.

---

## Security model

- **Passwords** are hashed with **scrypt** (memory-hard, Node built-in — no native module to
  compile). Format `scrypt$N$r$p$salt$hash`, so cost parameters can be raised later without
  invalidating existing hashes.
- **Access tokens** (JWT, 15 min) carry `sub`, `type` (`CUSTOMER`/`ADMIN`), `email` and, for
  admins, `role`. **Refresh tokens** (30 days) are stored **hashed** in `refresh_tokens`, rotate on
  every use, and are revoked on logout — a leaked refresh token cannot be replayed.
- **Guards are global and fail closed.** A route is protected unless it carries `@Public()`.
  `JwtAuthGuard` enforces the token *audience* (a customer token can never reach an admin route —
  `403`), and `RolesGuard` enforces admin RBAC with `SUPER_ADMIN` bypass, mirroring the old
  `hasPermission()`.
- **Checkout is server-authoritative.** Prices, discounts, delivery charges and totals are
  recomputed from the database; the request body carries no amounts.
- **Stock is decremented with an atomic conditional update** inside a transaction, so concurrent
  checkouts cannot oversell.

---

## Behaviour differences from the old client-side mock

These are deliberate changes; see `API.md` for detail.

1. **Reviews start as `PENDING`** and require admin approval. The mock auto-published them, which
   left the admin approve/reject queue permanently empty.
2. **Coupons enforce their validity window and usage limit.** The mock only checked `is_active` and
   the minimum order amount, so expired or exhausted coupons still worked.
3. **Delivery charge and totals are computed server-side** rather than trusted from the browser.
4. **Passwords are hashed**, and accounts are separate rows rather than plaintext arrays.
5. **`rating` / `reviewsCount` on a product remain denormalized admin-managed values.** They are
   *not* recomputed from the review table, because the seeded catalog carries marketing figures
   (e.g. 4.8 from 128 reviews) that outnumber the actual review rows.

## Known limitations

- No real bKash/Nagad integration — payment is recorded (`UNPAID`/`PAID`/`REFUNDED`) and verified
  manually, as in the original app.
- Cancelling or returning an order does **not** restock the products.
- Images are still plain URLs; there is no upload/object-storage endpoint.
- No rate limiting, email/SMS notifications, or OTP password reset yet.

---

## Troubleshooting

**`P2021: The table 'public.customers' does not exist`** — the database is reachable but has no
tables. Run the migrations against it (`npm run prisma:deploy`), then `npm run prisma:seed`.

**`prisma generate` fails with `EPERM ... query_engine-windows.dll.node`** — on Windows a running
API server holds the query-engine DLL. Stop the server, run `prisma generate`, start it again.

**Pooler errors during `prisma migrate`** (prepared statement / advisory lock failures) — migrations
are being run through a transaction pooler. Set `DIRECT_URL` to the direct or session-mode
connection (see [Configure](#3-configure)).

---

## Testing

```bash
npm run db:setup      # once, against a throwaway database
npm run test:e2e
```

The e2e suite covers pagination/search/filter/sort, product visibility (DRAFT hidden publicly),
401 vs 403 auth semantics, refresh-token rotation and reuse rejection, RBAC, coupon caps and
minimums, and the checkout transaction (stock decrement + coupon redemption + free-delivery
threshold).
