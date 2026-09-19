import prisma from './db.js'

export class CreditError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export async function getSetting() {
  return prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })
}

export function customPrice(setting, credits) {
  const perEntry = credits >= setting.customThreshold ? setting.customPriceAtAbove : setting.customPriceBelow
  return credits * perEntry
}

function positiveInt(value) {
  const n = Number(value)
  return Number.isInteger(n) && n > 0 ? n : null
}

// Balance change and ledger row in one transaction. The balance update is a
// single conditional statement so two concurrent deductions can't both pass.
async function applyChange(customerId, performedById, data) {
  return prisma.$transaction(async (tx) => {
    const changed = await tx.customer.updateMany({
      where: { id: customerId, ...(data.delta < 0 ? { credits: { gte: -data.delta } } : {}) },
      data: { credits: { increment: data.delta } },
    })
    if (changed.count === 0) {
      const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { credits: true } })
      if (!customer) throw new CreditError(404, 'Customer not found')
      throw new CreditError(409, `Not enough entries left (${customer.credits})`)
    }
    const transaction = await tx.transaction.create({ data: { customerId, performedById, ...data } })
    const customer = await tx.customer.findUnique({ where: { id: customerId } })
    return { customer, transaction }
  })
}

export async function topup(customerId, performedById, { packId, credits, amount, note }) {
  let creditsToAdd
  let price
  let packName

  if (packId != null) {
    const pack = await prisma.pack.findUnique({ where: { id: Number(packId) } })
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

  return applyChange(customerId, performedById, {
    type: 'TOPUP',
    delta: creditsToAdd,
    amount: price,
    packName,
    note: cleanNote || null,
  })
}

export async function useEntries(customerId, performedById, { count = 1, note } = {}) {
  const n = positiveInt(count)
  if (!n) throw new CreditError(400, 'Count must be a positive whole number')
  return applyChange(customerId, performedById, {
    type: 'ENTRY',
    delta: -n,
    note: note ? String(note) : null,
  })
}

export async function adjust(customerId, performedById, { delta, note }) {
  const n = Number(delta)
  if (!Number.isInteger(n) || n === 0) throw new CreditError(400, 'Delta must be a non-zero whole number')
  if (!note || !String(note).trim()) throw new CreditError(400, 'A note is required for adjustments')
  return applyChange(customerId, performedById, {
    type: 'ADJUST',
    delta: n,
    note: String(note).trim(),
  })
}

export const UNDO_WINDOW_MS = 15 * 60 * 1000

export async function undoEntry(transactionId, performedById) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.transaction.findUnique({
      where: { id: Number(transactionId) },
      include: { reversedBy: true },
    })
    if (!original || original.type !== 'ENTRY') throw new CreditError(404, 'Entry not found')
    if (original.reversedBy) throw new CreditError(409, 'Already undone')
    if (Date.now() - original.createdAt.getTime() > UNDO_WINDOW_MS) throw new CreditError(409, 'Too late to undo — use Adjust instead')

    // The unique index on reversalOfId makes a double undo fail here even under concurrency.
    const transaction = await tx.transaction.create({
      data: {
        customerId: original.customerId,
        performedById,
        type: 'ADJUST',
        delta: -original.delta,
        note: 'Undo entry',
        reversalOfId: original.id,
      },
    })
    const customer = await tx.customer.update({
      where: { id: original.customerId },
      data: { credits: { increment: -original.delta } },
    })
    return { customer, transaction }
  })
}
