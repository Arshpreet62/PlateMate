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

async function applyChange(customerId, performedById, data) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: customerId } })
    if (!customer) throw new CreditError(404, 'Customer not found')
    const newBalance = customer.credits + data.delta
    if (newBalance < 0) throw new CreditError(409, `Not enough credits (balance ${customer.credits})`)

    const transaction = await tx.transaction.create({ data: { customerId, performedById, ...data } })
    const updated = await tx.customer.update({ where: { id: customerId }, data: { credits: newBalance } })
    return { customer: updated, transaction }
  })
}

export async function topup(customerId, performedById, { packId, credits, amount, note }) {
  let creditsToAdd
  let price
  let packName

  if (packId != null) {
    const pack = await prisma.pack.findUnique({ where: { id: Number(packId) } })
    if (!pack || !pack.active) throw new CreditError(400, 'Pack not found')
    creditsToAdd = pack.credits
    price = pack.price
    packName = pack.name
  } else {
    creditsToAdd = positiveInt(credits)
    if (!creditsToAdd) throw new CreditError(400, 'Credits must be a positive whole number')
    price = customPrice(await getSetting(), creditsToAdd)
    packName = 'Custom'
  }

  if (amount != null && amount !== '') {
    const n = Number(amount)
    if (!Number.isInteger(n) || n < 0) throw new CreditError(400, 'Amount must be a whole number')
    price = n
  }

  return applyChange(customerId, performedById, {
    type: 'TOPUP',
    delta: creditsToAdd,
    amount: price,
    packName,
    note: note ? String(note) : null,
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
