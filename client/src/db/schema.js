import Dexie from 'dexie'

// Everything lives in this browser. There is no server and no network call
// anywhere in the app — IndexedDB on this device is the whole database.
export const db = new Dexie('buffet-pass')

db.version(1).stores({
  // nameLower is a real stored column with a unique index: that is what makes
  // two customers with the same name impossible, whatever the casing.
  customers: 'id, &nameLower, name, phone, createdAt',
  transactions: '++id, customerId, type, createdAt, [customerId+createdAt], &reversalOfId',
  packs: '++id, sortOrder',
  settings: 'id',
})

export const DEFAULT_SETTINGS = {
  id: 1,
  currency: '₹',
  customThreshold: 22,
  customPriceBelow: 90,
  customPriceAtAbove: 80,
}

const DEFAULT_PACKS = [
  { name: 'Week plan', credits: 5, price: 450, active: true, sortOrder: 1 },
  { name: 'Monthly pack', credits: 22, price: 1760, active: true, sortOrder: 2 },
]

export function normaliseName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ')
}

export function nameKey(name) {
  return normaliseName(name).toLowerCase()
}

// Runs on every start; only writes when the tables are empty, so it is safe to
// call again after an update.
export async function seed() {
  await db.transaction('rw', db.packs, db.settings, async () => {
    if ((await db.settings.get(1)) === undefined) await db.settings.add(DEFAULT_SETTINGS)
    if ((await db.packs.count()) === 0) await db.packs.bulkAdd(DEFAULT_PACKS)
  })
}

export async function resetForTests() {
  await db.transaction('rw', db.customers, db.transactions, db.packs, db.settings, async () => {
    await Promise.all([db.customers.clear(), db.transactions.clear(), db.packs.clear(), db.settings.clear()])
  })
  await seed()
}
