import { beforeEach, describe, expect, it } from 'vitest'
import {
  createCustomer,
  filterCustomers,
  findByName,
  findSimilar,
  getCustomer,
  listCustomers,
  updateCustomer,
} from '../src/db/customers.js'
import { spendEntries } from '../src/db/credits.js'
import { customerWith, resetForTests } from './helpers.js'

beforeEach(resetForTests)

describe('creating customers', () => {
  it('requires a name but not a phone', async () => {
    await expect(createCustomer({ phone: '1' })).rejects.toThrow(/Name is required/)
    const created = await createCustomer({ name: '  Guru   Sharma ', phone: '  ' })
    expect(created.name).toBe('Guru Sharma')
    expect(created.phone).toBeNull()
    const updated = await updateCustomer(created.id, { phone: '98765 43210' })
    expect(updated.phone).toBe('9876543210')
  })

  it('refuses a second customer with the same name, whatever the casing', async () => {
    await createCustomer({ name: 'Guru Sharma' })
    await expect(createCustomer({ name: 'guru  sharma' })).rejects.toThrow(/already has this exact name/)
    const other = await createCustomer({ name: 'Guru Verma' })
    await expect(updateCustomer(other.id, { name: 'GURU SHARMA' })).rejects.toThrow(/already has this exact name/)
    expect((await updateCustomer(other.id, { name: 'Guru Verma' })).name).toBe('Guru Verma')
  })
})

describe('finding customers', () => {
  it('matches on part of the name, ignoring case, and on phone digits', async () => {
    await createCustomer({ name: 'Ravi Kumar', phone: '9876543210' })
    await createCustomer({ name: 'Asha Rao', phone: '9000011111' })
    const all = await listCustomers()
    expect(filterCustomers(all, 'RAVI')).toHaveLength(1)
    expect(filterCustomers(all, 'kum')).toHaveLength(1)
    expect(filterCustomers(all, '98765 43210')).toHaveLength(1)
    expect(filterCustomers(all, '')).toHaveLength(2)
  })

  it('reports the last visit', async () => {
    const seen = await customerWith(5, 'Ravi Kumar')
    await createCustomer({ name: 'Never Been' })
    await spendEntries(seen.id, { count: 1 })
    const all = await listCustomers()
    expect(all.find((c) => c.id === seen.id).lastVisitAt).toBeInstanceOf(Date)
    expect(all.find((c) => c.name === 'Never Been').lastVisitAt).toBeNull()
  })

  it('spots an exact name and near-misses while typing', async () => {
    await createCustomer({ name: 'Guru Sharma' })
    expect((await findByName('  GURU sharma ')).name).toBe('Guru Sharma')
    expect(await findByName('Guru Verma')).toBeNull()
    expect((await findSimilar('Guru Verma')).map((c) => c.name)).toEqual(['Guru Sharma'])
    expect(await findSimilar('Guru Sharma')).toEqual([])
  })
})

describe('customer page', () => {
  it('returns the history newest first with a pass code', async () => {
    const customer = await customerWith(5)
    await spendEntries(customer.id, { count: 1 })
    await spendEntries(customer.id, { count: 2 })
    const full = await getCustomer(customer.id)
    expect(full.qr).toBe(`buffet:${customer.id}`)
    expect(full.transactions.map((t) => t.delta)).toEqual([-2, -1])
  })

  it('reports a missing customer', async () => {
    await expect(getCustomer('nope')).rejects.toThrow(/Customer not found/)
  })
})
