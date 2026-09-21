import { db, DEFAULT_SETTINGS } from './schema.js'

export class CreditError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function getSetting() {
  return (await db.settings.get(1)) ?? DEFAULT_SETTINGS
}

export function customPrice(setting, credits) {
  const perEntry = credits >= setting.customThreshold ? setting.customPriceAtAbove : setting.customPriceBelow
  return credits * perEntry
}

function positiveInt(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

// Balance change and ledger row in one IndexedDB transaction. Read-modify-write
// inside the transaction is safe: the browser runs readwrite transactions over
// the same stores one at a time, so a double tap cannot spend the same entry
// twice. Note this only protects *deductions* — two top-ups are both valid on
// their own, so a double tap there is caught at the button by useAction().
async function applyChange(customerId, data) {
  return db.transaction('rw', db.customers, db.transactions, async () => {
    const customer = await db.customers.get(customerId)
    if (!customer) throw new CreditError(404, 'Customer not found')
    if (data.delta < 0 && customer.credits < -data.delta) {
      throw new CreditError(409, `Not enough entries left (${customer.credits})`)
    }
    const credits = customer.credits + data.delta
    await db.customers.update(customerId, { credits })
    const id = await db.transactions.add({ customerId, createdAt: new Date(), ...data })
    return { customer: { ...customer, credits }, transaction: { id, customerId, ...data } }
  })
}

export async function topup(customerId, { packId, credits, amount, note }) {
  let creditsToAdd
  let price
  let packName

  if (packId != null) {
    const pack = await db.packs.get(Number(packId))
    if (!pack || !pack.active) throw new CreditError(400, 'Plan not found')
    creditsToAdd = pack.credits
    price = pack.price
    packName = pack.name
  } else {
    creditsToAdd = positiveInt(credits)
    if (!creditsToAdd) throw new CreditError(400, 'Entries must be a positive whole number')
    price = customPrice(await getSetting(), creditsToAdd)
    packName = 'Custom'
  }

  const cleanNote = note ? String(note).trim() : ''
  if (amount != null && amount !== '') {
    const n = Number(amount)
    if (!Number.isInteger(n) || n < 0) throw new CreditError(400, 'Amount must be a whole number')
    if (n !== price && !cleanNote) throw new CreditError(400, 'A note is required when the amount differs from the standard price')
    price = n
  }

  return applyChange(customerId, {
    type: 'TOPUP',
    delta: creditsToAdd,
    amount: price,
    packName,
    note: cleanNote || null,
  })
}

export async function spendEntries(customerId, { count = 1, note } = {}) {
  const n = positiveInt(count)
  if (!n) throw new CreditError(400, 'Count must be a positive whole number')
  return applyChange(customerId, {
    type: 'ENTRY',
    delta: -n,
    note: note ? String(note) : null,
  })
}

// Repairs a wrong balance, and always records why. It cannot push a balance
// below zero — a negative number of meals owed is not a thing the counter can
// act on, so the refusal is deliberate.
export async function adjust(customerId, { delta, note }) {
  const n = Number(delta)
  if (!Number.isInteger(n) || n === 0) throw new CreditError(400, 'Delta must be a non-zero whole number')
  if (!note || !String(note).trim()) throw new CreditError(400, 'A note is required for adjustments')
  return applyChange(customerId, {
    type: 'ADJUST',
    delta: n,
    note: String(note).trim(),
  })
}

// After this, a mistake is repaired with adjust() instead, which leaves a
// visible reason in the history rather than quietly rewriting the past.
export const UNDO_WINDOW_MS = 15 * 60 * 1000

export async function undoEntry(transactionId) {
  return db.transaction('rw', db.customers, db.transactions, async () => {
    const original = await db.transactions.get(Number(transactionId))
    if (!original || original.type !== 'ENTRY') throw new CreditError(404, 'Entry not found')
    if (Date.now() - original.createdAt.getTime() > UNDO_WINDOW_MS) {
      throw new CreditError(409, 'Too late to undo — use Adjust instead')
    }

    // The unique index on reversalOfId is what stops a double undo: the second
    // insert for the same entry fails instead of handing back the credits twice.
    let id
    try {
      id = await db.transactions.add({
        customerId: original.customerId,
        createdAt: new Date(),
        type: 'ADJUST',
        delta: -original.delta,
        note: 'Undo entry',
        reversalOfId: original.id,
      })
    } catch (err) {
      if (err?.name === 'ConstraintError') throw new CreditError(409, 'Already undone')
      throw err
    }

    const customer = await db.customers.get(original.customerId)
    if (!customer) throw new CreditError(404, 'Customer not found')
    const credits = customer.credits - original.delta
    await db.customers.update(customer.id, { credits })
    return { customer: { ...customer, credits }, transaction: { id } }
  })
}
