import Dexie from 'dexie'
import { CreditError } from './credits.js'
import { db, nameKey, normaliseName } from './schema.js'
import { qrCode } from './qr.js'

export const NAME_TAKEN = 'Another customer already has this exact name — add a surname or nickname'

// Dexie reports a unique-index clash directly on add(), but wraps it in a
// ModifyError on update() — check both shapes.
function isNameCollision(err) {
  if (!err) return false
  if (err.name === 'ConstraintError' || err.inner?.name === 'ConstraintError') return true
  return Array.isArray(err.failures) && err.failures.some((f) => f?.name === 'ConstraintError')
}

function validateDetails(body, { partial = false } = {}) {
  const out = {}
  if (!partial || body.name !== undefined) {
    const name = normaliseName(body.name)
    if (!name) return { error: 'Name is required' }
    out.name = name
    out.nameLower = nameKey(name)
  }
  if (body.phone !== undefined) {
    const phone = String(body.phone ?? '').replace(/\s+/g, '')
    out.phone = phone || null
  }
  if (body.notes !== undefined) out.notes = body.notes ? String(body.notes).trim() : null
  return { data: out }
}

// One pass over the entry log; cheaper than a query per customer.
async function lastVisitMap() {
  const map = new Map()
  await db.transactions.where('type').equals('ENTRY').each((t) => {
    const seen = map.get(t.customerId)
    if (!seen || t.createdAt > seen) map.set(t.customerId, t.createdAt)
  })
  return map
}

// Every customer, newest first. Small enough to hold in memory, which is what
// lets the search box filter instantly without touching the database again.
export async function listCustomers() {
  const [customers, visits] = await Promise.all([db.customers.orderBy('createdAt').reverse().toArray(), lastVisitMap()])
  return customers.map((c) => ({ ...c, lastVisitAt: visits.get(c.id) ?? null }))
}

// Client-side filter for the list above: name first, then phone digits.
export function filterCustomers(customers, query) {
  const q = normaliseName(query).toLowerCase()
  if (!q) return customers
  const digits = q.replace(/[^0-9]/g, '')
  return customers.filter(
    (c) => c.nameLower.includes(q) || (digits && c.phone?.replace(/[^0-9]/g, '').includes(digits)),
  )
}

export async function findByName(name) {
  const key = nameKey(name)
  return key ? ((await db.customers.where('nameLower').equals(key).first()) ?? null) : null
}

// Same first word, different person — worth showing as a hint, not an error.
export async function findSimilar(name) {
  const key = nameKey(name)
  const first = key.split(' ')[0]
  if (first.length < 3) return []
  const all = await db.customers.where('nameLower').startsWith(first).toArray()
  return all.filter((c) => c.nameLower !== key).slice(0, 5)
}

export async function getCustomer(id) {
  const customer = await db.customers.get(id)
  if (!customer) throw new CreditError(404, 'Customer not found')
  const transactions = await db.transactions
    .where('[customerId+createdAt]')
    .between([id, Dexie.minKey], [id, Dexie.maxKey])
    .reverse()
    .limit(20)
    .toArray()
  return { ...customer, transactions, qr: qrCode(customer) }
}

export async function createCustomer(body) {
  const { data, error } = validateDetails(body ?? {})
  if (error) throw new CreditError(400, error)
  const customer = { id: crypto.randomUUID(), credits: 0, phone: null, notes: null, createdAt: new Date(), ...data }
  try {
    await db.customers.add(customer)
  } catch (err) {
    if (isNameCollision(err)) throw new CreditError(409, NAME_TAKEN)
    throw err
  }
  return customer
}

export async function updateCustomer(id, body) {
  const { data, error } = validateDetails(body ?? {}, { partial: true })
  if (error) throw new CreditError(400, error)
  try {
    await db.customers.update(id, data)
  } catch (err) {
    if (isNameCollision(err)) throw new CreditError(409, NAME_TAKEN)
    throw err
  }
  const customer = await db.customers.get(id)
  if (!customer) throw new CreditError(404, 'Customer not found')
  return customer
}

export async function countCustomers() {
  return db.customers.count()
}
