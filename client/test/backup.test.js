import { beforeEach, describe, expect, it } from 'vitest'
import { backupFileName, exportBackup, importBackup } from '../src/db/backup.js'
import { spendEntries, topup, undoEntry } from '../src/db/credits.js'
import { getCustomer, listCustomers } from '../src/db/customers.js'
import { listPacks, updateSettings } from '../src/db/packs.js'
import { customerWith, db, packNamed, resetForTests } from './helpers.js'

beforeEach(resetForTests)

async function aFullDatabase() {
  const customer = await customerWith(0, 'Guru Sharma')
  const pack = await packNamed('Week plan')
  await topup(customer.id, { packId: pack.id })
  await spendEntries(customer.id, { count: 2 })
  await updateSettings({ customPriceBelow: 95 })
  return customer
}

describe('backup round trip', () => {
  it('brings back every customer, balance and history', async () => {
    const customer = await aFullDatabase()
    const file = JSON.stringify(await exportBackup())

    await db.customers.clear()
    await db.transactions.clear()
    expect(await listCustomers()).toHaveLength(0)

    const result = await importBackup(file)
    expect(result.customers).toBe(1)

    const restored = await getCustomer(customer.id)
    expect(restored.name).toBe('Guru Sharma')
    expect(restored.credits).toBe(3)
    expect(restored.transactions).toHaveLength(2)
    expect((await listPacks())).toHaveLength(2)
    expect((await db.settings.get(1)).customPriceBelow).toBe(95)
  })

  // JSON turns Dates into strings. undoEntry calls createdAt.getTime(), so if
  // the importer does not revive them a restored entry cannot be undone.
  it('restores dates as real dates, so undo still works afterwards', async () => {
    const customer = await customerWith(5)
    const { transaction } = await spendEntries(customer.id, { count: 1 })
    const file = JSON.stringify(await exportBackup())
    await db.customers.clear()
    await db.transactions.clear()
    await importBackup(file)

    expect((await db.transactions.get(transaction.id)).createdAt).toBeInstanceOf(Date)
    expect((await db.customers.get(customer.id)).createdAt).toBeInstanceOf(Date)
    expect((await undoEntry(transaction.id)).customer.credits).toBe(5)
  })

  it('keeps passes working after a restore', async () => {
    const customer = await customerWith(5)
    const file = JSON.stringify(await exportBackup())
    await db.customers.clear()
    await importBackup(file)
    const { scan } = await import('../src/db/qr.js')
    expect((await scan(`platemate:${customer.passCode}`)).id).toBe(customer.id)
  })

  it('names the file after the day it was made', () => {
    expect(backupFileName(new Date('2026-09-21T10:00:00Z'))).toBe('platemate-backup-2026-09-21.json')
  })
})

describe('bad backup files', () => {
  it('refuses them without touching what is already there', async () => {
    const customer = await aFullDatabase()
    const survives = async () => {
      expect(await db.customers.count()).toBe(1)
      expect((await db.customers.get(customer.id)).credits).toBe(3)
    }

    await expect(importBackup('not json at all')).rejects.toThrow(/isn't a PlateMate backup/)
    await survives()
    await expect(importBackup('{"app":"something-else"}')).rejects.toThrow(/isn't a PlateMate backup/)
    await survives()
    await expect(importBackup('{"app":"platemate","schema":99}')).rejects.toThrow(/different version/)
    await survives()
    await expect(importBackup('{"app":"platemate","schema":1}')).rejects.toThrow(/missing data/)
    await survives()
    await expect(
      importBackup('{"app":"platemate","schema":1,"customers":[{"id":"x","createdAt":"never"}],"transactions":[],"packs":[]}'),
    ).rejects.toThrow(/bad createdAt/)
    await survives()
  })
})
