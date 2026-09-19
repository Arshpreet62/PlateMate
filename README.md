# Buffet Pass

Staff app for a buffet that sells entry credits. Register customers, sell
packs of entries, deduct entries when they eat, and keep a history of every
change. Runs as an installable PWA on the staff's Android phone.

- `client/` — React + Vite + Mantine PWA
- `server/` — Express API, Prisma, Postgres
- `api/index.js` — Vercel serverless entry (wraps the Express app)

## Local development

Requirements: Node 24, Docker (for the local Postgres).

```bash
docker compose up -d                 # Postgres on localhost:5432
cp server/.env.example server/.env   # then fill in the values
npm install
npm run db:migrate                   # applies migrations (cd server && npx prisma migrate dev when changing the schema)
npm run db:seed                      # packs, settings, first owner user
npm run dev                          # client on :5173, API on :3001
```

Log in with `SEED_OWNER_USERNAME` / `SEED_OWNER_PASSWORD` from `server/.env`.

Tests (API, against `TEST_DATABASE_URL`):

```bash
docker exec buffet-pass-db psql -U buffet -c "CREATE DATABASE buffet_test;"  # once
npm test
```

Useful: `cd server && npx prisma studio` opens a GUI for the database.

Start fresh (deletes all customers and history, keeps logins/packs):
`cd server && PRISMA_DATABASE_URL="<direct url>" node scripts/reset-customers.js --yes`

## Business rules

- Packs are editable in the database (`Pack` table); seeded with
  **Week plan** (5 entries, 450) and **Monthly pack** (22 entries, 1760).
- Custom top-ups: 90 per entry below 22 entries, 80 per entry from 22 up
  (`Setting` table). Staff can override the amount (e.g. a discount).
- Entries can be used several at a time; refused if the balance is too low.
- Phone number is optional and can be added later from the customer's page.
- Every customer has a signed QR code (Show QR on their page). Staff scan it
  from the home screen; forged or replaced codes are rejected.
- Every top-up, entry, and adjustment is logged with who did it.
- Roles: `OWNER` can adjust balances, edit packs/settings, manage staff.
  `STAFF` can search, add customers, sell, and deduct.

## Deploying (free: Vercel + Neon)

1. **Neon**: create a free project. Copy the *pooled* connection string and
   the *direct* one.
2. **Vercel**: import this repo. Set environment variables:
   - `DATABASE_URL` — Neon pooled URL
   - `SESSION_SECRET`, `QR_SECRET` — `openssl rand -base64 32` each
   - `APP_TZ` — e.g. `Asia/Kolkata` (`TZ` is reserved on Vercel)
   Build settings come from `vercel.json`.
3. **Migrate + seed** the production DB from your machine (uses the direct
   URL):
   ```bash
   cd server
   PRISMA_DATABASE_URL="<neon direct url>" npx prisma migrate deploy
   PRISMA_DATABASE_URL="<neon direct url>" SEED_OWNER_USERNAME=owner SEED_OWNER_PASSWORD='<strong password>' npx prisma db seed
   ```
4. Open the Vercel URL on the Android phone in Chrome → menu → **Add to
   Home screen**. PWA install and the camera scanner both require HTTPS,
   which Vercel provides.

Repeat step 3's `migrate deploy` whenever a new version adds a migration.

## Roadmap

- v0.1 — customers, packs, entries, history, login
- v0.2 — signed QR per customer + camera scanner, optional phone
- v0.3 — counter redesign: one-tap deduct with undo, today's visits, bottom nav, no money on shared screens (this version)
- v0.3 — owner tools: staff accounts, pack/price editing, CSV export
