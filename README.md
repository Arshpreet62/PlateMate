# PlateMate

Counter app for a buffet that sells meal passes. Add a customer, give them a
plan, and tick off a meal each time they come to eat. Runs as an installable
app on the owner's phone.

**It counts meals, not money.** There are no prices anywhere in the app —
payment is settled at the counter, and a plan is simply a name and a number of
entries.

**There is no server.** The app keeps its own database inside the browser
(IndexedDB), so it works with the internet switched off, costs nothing to run,
and the customer records never leave the device they were created on.

For the person actually running the buffet, see
**[docs/OWNER-GUIDE.md](docs/OWNER-GUIDE.md)** — same app, no jargon.

---

## Working on it

Requirements: Node 24. Nothing else — no database to install, no environment
variables, no accounts.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # business rules: pricing, balances, undo, names, backups
npm run lint -w client
npm run build    # static files in client/dist
npm run preview  # serve that build
```

App icons are generated from one SVG: `npm run icons -w client`
([client/scripts/make-icons.js](client/scripts/make-icons.js) holds the mark).

## Deploying

The build is plain static files. Put `client/dist` on any free host — Vercel,
GitHub Pages, Netlify. [vercel.json](vercel.json) is already configured.

The host only delivers the code. Customers, balances and history are created
on the phone and stay there, so there is nothing to provision and nothing to
secure server-side.

Then, on the phone: open the link in Chrome → menu → **Add to Home screen**.
HTTPS is required — both "Add to Home screen" and the QR camera refuse to work
without it — and every one of those hosts provides it.

---

## How it is put together

```
client/
  src/db/        the database — all the rules live here, no React
    schema.js      tables, indexes, seeding, storage persistence
    credits.js     top-ups, entries, adjustments, undo  (the money rules)
    customers.js   create/search/read, unique names
    packs.js       plans (name + number of entries)
    qr.js          passes: issue, parse, scan, replace
    backup.js      export/import the whole database as one JSON file
  src/pages/     one file per screen
  src/components/
  test/          vitest + fake-indexeddb, run against src/db directly
```

`src/db/` is the part worth reading first. It has no React in it and every
rule is enforced there rather than in a screen, which is why the tests can
cover the whole business logic without rendering anything.

### Five decisions worth knowing

**Balances change inside a transaction.** `applyChange` in
[credits.js](client/src/db/credits.js) re-reads the balance and writes the
ledger row in one IndexedDB transaction, so two taps landing together cannot
both spend the last entry. Adding entries has no such natural guard, so the
*tap* is guarded instead, by [useAction.js](client/src/useAction.js) — a ref
flips synchronously where React state would not, which is what stops a double
tap charging once and crediting twice.

**Uniqueness is an index, not a check.** Customers carry a stored `nameLower`
and a stored `passCode`, both with unique indexes. Duplicate names and
duplicate passes are impossible at the database level, not merely unlikely.

**Undo has no time limit, on purpose.** It used to expire after 15 minutes,
which made sense while it lived in a toast that expired too. Now that it sits
on the history row it is found deliberately, and a button that disappears on a
timer while someone is looking at it is worse than one that is always there.
`getCustomer` marks each row `undone`, so a reversed entry shows as cancelled
instead of just losing its button.

**A customer row cannot spend an entry.** The list is navigation only; the
balance sits where a Use button would otherwise be. Deducting always costs a
tap into the customer's own page, where their name and balance are in full
view — a stray thumb on a scrolling list must never be able to take someone's
meal.

**Passes point at a `passCode`, not at the customer id.** That is what makes
**Replace pass** possible: issue a new code and every photo of the old one
stops resolving. There is no signature on a pass — with no server there is
nothing to forge against, and an unknown code simply does not match anything.

---

## ⚠️ Changing the database schema — read this first

[schema.js](client/src/db/schema.js) declares `db.version(1)`. **Never edit
that block once a build is on someone's phone.** IndexedDB only runs upgrades
for versions it has not seen, so an edit to `version(1)` is silently skipped on
a device that already has version 1 — the code then expects columns the stored
data does not have, and the failure shows up later as missing or wrong data.

To change anything, add a new version and leave the old one untouched:

```js
db.version(1).stores({ /* … exactly as it is … */ })

db.version(2)
  .stores({ customers: 'id, &nameLower, &passCode, name, phone, createdAt, tier' })
  .upgrade((tx) => tx.table('customers').toCollection().modify((c) => { c.tier = 'regular' }))
```

Bump `SCHEMA` in [backup.js](client/src/db/backup.js) too, so an older backup
file is rejected with a clear message rather than restored into the wrong shape.

---

## What the app does

- **Plans** are edited in the app (Menu → Plans). It ships with **Week plan**
  (5 entries) and **Monthly pack** (22 entries). A plan is a name and a number
  of entries — nothing else.
- **Custom top-ups** add any number of entries, for the cases a plan does not
  cover.
- **The customer list is read-only.** Rows show the balance and open the
  customer; entries are only ever spent from the customer's own page or after
  a scan.
- **One tap is one meal.** A group of four is four taps, each its own history
  line. Entries are refused when the balance is too low.
- **Undo lives on the history row**, not in a popup, and never expires. It
  writes a visible `Undo entry` line rather than erasing anything. **Adjust
  balance** remains for corrections that are not a straight reversal.
- **New customer** = name → plan → QR pass, in one flow. A name clash appears
  while it is being typed; similar names show a non-blocking hint.
- **Passes**: each customer gets a QR, shareable as an image. **Add** and
  **Scan pass** sit together at the top of the counter screen, Scan the wider
  of the two. A leaked pass can be replaced.
- **Backup**: Menu → Backup downloads the whole database as one JSON file, and
  restores from it.

## Known limits

- One browser profile is one dataset. Two phones do not share customers, and
  there is no sync. Moving to a new phone means backup → restore.
- Restoring replaces everything; two copies that have both moved on cannot be
  merged.
- Clearing the browser's site data deletes the database. The app asks the
  browser for persistent storage to reduce the chance of automatic eviction,
  and nags in Menu when the last backup is over a week old, but a deliberate
  "clear data" still wins. Backups are the answer.

## Versions

- v0.1 — customers, packs, entries, history, login
- v0.2 — QR per customer + camera scanner, optional phone
- v0.3 — counter redesign: one-tap deduct with undo, bottom nav
- v0.4 — creation wizard, atomic balances, unique names
- v0.5 — no server and no login: the database moved into the app itself
- **v1.0** — renamed to PlateMate; fixed a double tap that could credit a plan
  twice; storage failures now explain themselves instead of showing a blank
  screen; undone entries no longer count as visits; full history on request;
  passes can be replaced; backup and restore
- **v1.1** — money removed from the app entirely; the customer list can no
  longer spend an entry (balance replaces the Use button, deduct from the
  customer's page); Scan pass promoted to the top of the counter screen; fixed
  the plan picker treating a normal plan as a custom one and springing open a
  stepper at 10 entries
- **v1.2** — undo moved from the toast to the history row and no longer
  expires; the "how many people are eating" stepper is gone (one tap is one
  meal); Add and Scan pass share one row at the top; the icon is a plate
