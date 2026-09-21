import Dexie from 'dexie'

// Everything lives in this browser. There is no server and no network call
// anywhere in the app — IndexedDB on this device is the whole database.
//
// The database is still called "buffet-pass" even though the app is now
// PlateMate: the name is an identity, not a label. Renaming it would make the
// browser open a different, empty database and orphan everything already saved.
export const db = new Dexie('buffet-pass')

// ┌──────────────────────────────────────────────────────────────────────┐
// │ CHANGING THIS SCHEMA                                                 │
// │ Never edit version(1) once a build is in someone's hands — the       │
// │ browser only runs upgrades for versions it has not seen, so an edit  │
// │ here is silently ignored on their device and the code then expects   │
// │ fields the data does not have. Add db.version(2).stores({...}) with  │
// │ an .upgrade() that backfills, and leave version(1) exactly as it is. │
// └──────────────────────────────────────────────────────────────────────┘
db.version(1).stores({
  // nameLower and passCode are real stored columns with unique indexes. They
  // are what make a duplicate name and a duplicate pass impossible, rather
  // than code remembering to check.
  customers: 'id, &nameLower, &passCode, name, phone, createdAt',
  transactions: '++id, customerId, type, createdAt, [customerId+createdAt], &reversalOfId',
  packs: '++id, sortOrder',
  settings: 'id',
})

// The app counts meals and nothing else — money is settled at the counter and
// deliberately never enters the database.
export const DEFAULT_SETTINGS = {
  id: 1,
  lastBackupAt: null,
}

const DEFAULT_PACKS = [
  { name: 'Week plan', credits: 5, active: true, sortOrder: 1 },
  { name: 'Monthly pack', credits: 22, active: true, sortOrder: 2 },
]

export function normaliseName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ')
}

export function nameKey(name) {
  return normaliseName(name).toLowerCase()
}

// 16 random bytes as base64url: unguessable, and much shorter than a UUID, so
// the QR has fewer modules and scans from further away.
export function newPassCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Runs on every start; only writes when the tables are empty, so it is safe to
// call again after an update.
export async function seed() {
  await db.transaction('rw', db.packs, db.settings, async () => {
    if ((await db.settings.get(1)) === undefined) await db.settings.add(DEFAULT_SETTINGS)
    if ((await db.packs.count()) === 0) await db.packs.bulkAdd(DEFAULT_PACKS)
  })
}

// Browsers may throw away IndexedDB under storage pressure unless the origin is
// marked persistent. An installed PWA is usually granted this silently; asking
// costs nothing and there is no other copy of the owner's data.
export async function requestPersistence() {
  try {
    if (await navigator.storage?.persisted?.()) return true
    return (await navigator.storage?.persist?.()) ?? false
  } catch {
    return false
  }
}

export async function clearEverything() {
  await db.transaction('rw', db.customers, db.transactions, db.packs, db.settings, async () => {
    await Promise.all([db.customers.clear(), db.transactions.clear(), db.packs.clear(), db.settings.clear()])
  })
}

export async function resetForTests() {
  await clearEverything()
  await seed()
}
