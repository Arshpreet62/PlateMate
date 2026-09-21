import { beforeEach, describe, expect, it } from 'vitest'
import { adjust, topup, undoEntry, useEntries, UNDO_WINDOW_MS } from '../src/db/credits.js'
import { quote } from '../src/db/packs.js'
import { customerWith, db, packNamed, resetForTests } from './helpers.js'

beforeEach(resetForTests)

describe('top-ups', () => {
  it('adds a plan at its listed price', async () => {
    const customer = await customerWith(0)
    const pack = await packNamed('Monthly pack')
    const { customer: after, transaction } = await topup(customer.id, { packId: pack.id })
    expect(after.credits).toBe(22)
    expect(transaction.amount).toBe(1760)
    expect(transaction.packName).toBe('Monthly pack')
  })

  it('prices custom entries either side of the threshold', async () => {
    expect(await quote(21)).toEqual({ credits: 21, price: 21 * 90 })
    expect(await quote(22)).toEqual({ credits: 22, price: 22 * 80 })
  })

  it('requires a note when the amount differs from the standard price', async () => {
    const customer = await customerWith(0)
    await expect(topup(customer.id, { credits: 5, amount: 300 })).rejects.toThrow(/note is required/)
    const { transaction } = await topup(customer.id, { credits: 5, amount: 300, note: 'regular, gave a discount' })
    expect(transaction.amount).toBe(300)
  })

  it('refuses a plan that is not on sale', async () => {
    const customer = await customerWith(0)
    const pack = await packNamed('Week plan')
    await db.packs.update(pack.id, { active: false })
    await expect(topup(customer.id, { packId: pack.id })).rejects.toThrow(/Plan not found/)
  })
})

describe('entries', () => {
  it('deducts and refuses to go below zero', async () => {
    const customer = await customerWith(2)
    expect((await useEntries(customer.id, { count: 2 })).customer.credits).toBe(0)
    await expect(useEntries(customer.id, { count: 1 })).rejects.toThrow(/Not enough entries left \(0\)/)
  })

  it('cannot deduct twice from a double tap', async () => {
    const customer = await customerWith(1)
    const results = await Promise.allSettled([
      useEntries(customer.id, { count: 1 }),
      useEntries(customer.id, { count: 1 }),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect((await db.customers.get(customer.id)).credits).toBe(0)
  })
})

describe('undo', () => {
  it('gives the entries back once, and only once', async () => {
    const customer = await customerWith(5)
    const { transaction } = await useEntries(customer.id, { count: 2 })
    expect((await undoEntry(transaction.id)).customer.credits).toBe(5)
    await expect(undoEntry(transaction.id)).rejects.toThrow(/Already undone/)
    expect((await db.customers.get(customer.id)).credits).toBe(5)
  })

  it('closes after the undo window', async () => {
    const customer = await customerWith(5)
    const { transaction } = await useEntries(customer.id, { count: 1 })
    await db.transactions.update(transaction.id, { createdAt: new Date(Date.now() - UNDO_WINDOW_MS - 1000) })
    await expect(undoEntry(transaction.id)).rejects.toThrow(/Too late to undo/)
  })

  it('only undoes entries', async () => {
    const customer = await customerWith(0)
    const pack = await packNamed('Week plan')
    const { transaction } = await topup(customer.id, { packId: pack.id })
    await expect(undoEntry(transaction.id)).rejects.toThrow(/Entry not found/)
  })
})

describe('adjustments', () => {
  it('needs a reason and a non-zero change', async () => {
    const customer = await customerWith(3)
    await expect(adjust(customer.id, { delta: 1, note: '  ' })).rejects.toThrow(/note is required/)
    await expect(adjust(customer.id, { delta: 0, note: 'x' })).rejects.toThrow(/non-zero/)
    expect((await adjust(customer.id, { delta: -1, note: 'counted twice' })).customer.credits).toBe(2)
  })
})
