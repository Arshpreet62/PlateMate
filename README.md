# Buffet Pass

Counter app for a buffet that sells meal passes. Add a customer, sell them a
plan, and tap once each time they eat. Runs as an installable app on the
owner's phone.

**Everything is stored on the device.** There is no server, no account and no
login — the app keeps its own database (IndexedDB) inside the browser, so it
works with the internet switched off and nothing is ever sent anywhere.

- `client/` — the whole app: React + Vite + Mantine, installable as a PWA
- `client/src/db/` — the database: tables, plans, balances, history

## Working on it

Requirements: Node 24. Nothing else — no database to install, no environment
variables to set.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # business rules: pricing, balances, undo, unique names
npm run build      # static files in client/dist
npm run preview    # serve that build
```

The app icons are generated from one SVG: `npm run icons -w client` after
editing `client/scripts/make-icons.js`.

## Installing it for the owner

1. `npm run build`, then put `client/dist` on any free static host (Vercel,
   GitHub Pages, Netlify). `vercel.json` is already set up for Vercel.
2. Open the link on the phone in Chrome → menu → **Add to Home screen**.
3. That's it. The host only delivers the app's code; the customers, balances
   and history are created on the phone and stay there.

HTTPS matters: both "Add to Home screen" and the QR camera need it, and every
one of those hosts provides it.

**There is no backup yet.** Clearing the browser's data, or losing the phone,
loses the records for good. Worth adding before the customer list gets long.

Each browser keeps its own separate data — two phones do not share customers.

## How it works

- **Plans** are editable in the app (Menu → Plans & prices); it starts with
  **Week plan** (5 entries, ₹450) and **Monthly pack** (22 entries, ₹1760).
- **Custom top-ups**: ₹90 per entry below 22 entries, ₹80 per entry from 22 up.
  Both the prices and where the cheaper rate starts are editable.
- **Entries** can be used several at a time and are refused if the balance is
  too low — a double tap cannot deduct twice. Undo is in the toast right after,
  or **Adjust balance** on the customer's page later, which records a reason.
- **New customer** = name → pick a plan → QR pass, in one guided flow. A clash
  with an existing name shows up while the name is being typed, and the
  database refuses duplicates outright (case-insensitive).
- **Passes**: every customer gets a QR code (QR code on their page, shareable
  as an image). Scan it from the icon in the search bar.
- **Money** stays off the screen except plan prices while selling.
- Every top-up, entry and adjustment is kept in the customer's history.

## Versions

- v0.1 — customers, packs, entries, history, login
- v0.2 — QR per customer + camera scanner, optional phone
- v0.3 — counter redesign: one-tap deduct with undo, today's visits, bottom nav
- v0.4 — creation wizard (name → plan → QR), atomic balances, unique names
- v0.5 — no server and no login: the database moved into the app itself; home
  is now the customer list with a filter; plans and prices are editable in the
  app; new indigo design (this version)
