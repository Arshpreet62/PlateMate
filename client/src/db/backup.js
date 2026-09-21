import { CreditError, getSetting } from './credits.js'
import { clearEverything, db, seed } from './schema.js'

const APP = 'platemate'
const SCHEMA = 1

// JSON has no Date type, so every date goes out as an ISO string and has to be
// turned back into a real Date on the way in. This is not cosmetic: undoEntry
// calls createdAt.getTime(), which throws on a string, so a restored backup
// would look fine until someone tried to undo an entry.
const DATE_FIELDS = { customers: ['createdAt'], transactions: ['createdAt'] }

function reviveDates(rows, fields) {
  return rows.map((row) => {
    const out = { ...row }
    for (const field of fields) {
      if (out[field] == null) continue
      const date = new Date(out[field])
      if (Number.isNaN(date.getTime())) throw new CreditError(400, `This file has a bad ${field} — it may be damaged`)
      out[field] = date
    }
    return out
  })
}

export async function exportBackup() {
  const [customers, transactions, packs, settings] = await Promise.all([
    db.customers.toArray(),
    db.transactions.toArray(),
    db.packs.toArray(),
    getSetting(),
  ])
  return {
    app: APP,
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    customers,
    transactions,
    packs,
    settings,
  }
}

export function backupFileName(date = new Date()) {
  const [day] = date.toISOString().split('T')
  return `platemate-backup-${day}.json`
}

export async function markBackedUp() {
  const settings = await getSetting()
  await db.settings.put({ ...settings, lastBackupAt: new Date().toISOString() })
}

function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new CreditError(400, "That file isn't a PlateMate backup")
  }
  if (data?.app !== APP) throw new CreditError(400, "That file isn't a PlateMate backup")
  if (data.schema !== SCHEMA) {
    throw new CreditError(400, `That backup was made by a different version of the app (${data.schema})`)
  }
  for (const table of ['customers', 'transactions', 'packs']) {
    if (!Array.isArray(data[table])) throw new CreditError(400, 'That backup is missing data — it may be damaged')
  }
  return data
}

// Replaces everything. Merging two copies that have both moved on is guesswork
// — which balance wins? — so restoring is deliberately all-or-nothing, and the
// caller warns before it runs.
export async function importBackup(text) {
  const data = parseBackup(text)
  const customers = reviveDates(data.customers, DATE_FIELDS.customers)
  const transactions = reviveDates(data.transactions, DATE_FIELDS.transactions)

  await clearEverything()
  await db.transaction('rw', db.customers, db.transactions, db.packs, db.settings, async () => {
    if (customers.length) await db.customers.bulkAdd(customers)
    if (transactions.length) await db.transactions.bulkAdd(transactions)
    if (data.packs.length) await db.packs.bulkAdd(data.packs)
    if (data.settings) await db.settings.put({ ...data.settings, id: 1 })
  })
  // A backup from before some plans existed would otherwise leave nothing to sell.
  await seed()

  return { customers: customers.length, transactions: transactions.length }
}
