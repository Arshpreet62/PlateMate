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

export async function topup(customerId, { packId, credits, note }) {
  let creditsToAdd
  let packName

  if (packId != null) {
    const pack = await db.packs.get(Number(packId))
    if (!pack || !pack.active) throw new CreditError(400, 'Plan not found')
    creditsToAdd = pack.credits
    packName = pack.name
  } else {
    creditsToAdd = positiveInt(credits)
    if (!creditsToAdd) throw new CreditError(400, 'Entries must be a positive whole number')
    packName = 'Custom'
  }

  return applyChange(customerId, {
    type: 'TOPUP',
    delta: creditsToAdd,
    packName,
    note: note ? String(note).trim() || null : null,
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

// Undo has no time limit. It used to expire after 15 minutes, back when it
// lived in a toast that expired too; now that it sits in the history it is
// found on purpose, and a button that vanishes on a timer while someone is
// looking at it is worse than one that is always there. It is not a silent
// edit either — the reversal is written as its own visible history row.
export async function undoEntry(transactionId) {
  return db.transaction('rw', db.customers, db.transactions, async () => {
    const original = await db.transactions.get(Number(transactionId))
    if (!original || original.type !== 'ENTRY') throw new CreditError(404, 'Entry not found')

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
