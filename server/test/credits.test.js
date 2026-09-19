import { beforeEach, describe, expect, it } from 'vitest'
import { customPrice } from '../src/credits.js'
import { createCustomer, createUser, loginAs, ownerAgent, resetDb } from './helpers.js'

beforeEach(resetDb)

describe('custom pricing', () => {
  const setting = { customThreshold: 22, customPriceBelow: 90, customPriceAtAbove: 80 }
  it('charges 90 per entry below the threshold', () => {
    expect(customPrice(setting, 1)).toBe(90)
    expect(customPrice(setting, 21)).toBe(1890)
  })
  it('charges 80 per entry at and above the threshold', () => {
    expect(customPrice(setting, 22)).toBe(1760)
    expect(customPrice(setting, 23)).toBe(1840)
  })
})

describe('top-up', () => {
  it('adds pack credits and records pack name and price', async () => {
    const agent = await ownerAgent()
    const customer = await createCustomer(agent)
    const res = await agent.post(`/api/customers/${customer.id}/topup`).send({ packId: 1 })
    expect(res.status).toBe(200)
    expect(res.body.customer.credits).toBe(5)
    expect(res.body.transaction).toMatchObject({ type: 'TOPUP', delta: 5, amount: 450, packName: 'Week plan' })
  })

  it('prices custom credits server-side and allows an amount override', async () => {
    const agent = await ownerAgent()
    const customer = await createCustomer(agent)
    const quoted = await agent.post(`/api/customers/${customer.id}/topup`).send({ credits: 10 })
    expect(quoted.body.transaction).toMatchObject({ delta: 10, amount: 900, packName: 'Custom' })
    const overridden = await agent.post(`/api/customers/${customer.id}/topup`).send({ credits: 22, amount: 1700, note: 'discount' })
    expect(overridden.body.transaction).toMatchObject({ delta: 22, amount: 1700, note: 'discount' })
    expect(overridden.body.customer.credits).toBe(32)
  })

  it('rejects invalid input', async () => {
    const agent = await ownerAgent()
    const customer = await createCustomer(agent)
    expect((await agent.post(`/api/customers/${customer.id}/topup`).send({ credits: 0 })).status).toBe(400)
    expect((await agent.post(`/api/customers/${customer.id}/topup`).send({ credits: 2.5 })).status).toBe(400)
    expect((await agent.post(`/api/customers/${customer.id}/topup`).send({ packId: 999 })).status).toBe(400)
  })
})

describe('entries', () => {
  it('deducts N entries and refuses when balance is too low', async () => {
    const agent = await ownerAgent()
    const customer = await createCustomer(agent)
    await agent.post(`/api/customers/${customer.id}/topup`).send({ packId: 1 })

    const three = await agent.post(`/api/customers/${customer.id}/entry`).send({ count: 3 })
    expect(three.status).toBe(200)
    expect(three.body.customer.credits).toBe(2)
    expect(three.body.transaction).toMatchObject({ type: 'ENTRY', delta: -3 })

    const tooMany = await agent.post(`/api/customers/${customer.id}/entry`).send({ count: 3 })
    expect(tooMany.status).toBe(409)

    const one = await agent.post(`/api/customers/${customer.id}/entry`).send({})
    expect(one.body.customer.credits).toBe(1)
  })

  it('records who performed the transaction', async () => {
    const owner = await ownerAgent()
    const customer = await createCustomer(owner)
    await owner.post(`/api/customers/${customer.id}/topup`).send({ packId: 1 })
    const staffUser = await createUser({ username: 'ravi', name: 'Ravi' })
    const staff = await loginAs('ravi')
    const res = await staff.post(`/api/customers/${customer.id}/entry`).send({ count: 1 })
    expect(res.body.transaction.performedById).toBe(staffUser.id)
    const detail = await owner.get(`/api/customers/${customer.id}`)
    expect(detail.body.transactions[0].performedBy.name).toBe('Ravi')
  })
})

describe('adjust', () => {
  it('requires owner and a note', async () => {
    const owner = await ownerAgent()
    const customer = await createCustomer(owner)
    await createUser({ username: 'ravi' })
    const staff = await loginAs('ravi')
    expect((await staff.post(`/api/customers/${customer.id}/adjust`).send({ delta: 1, note: 'x' })).status).toBe(403)
    expect((await owner.post(`/api/customers/${customer.id}/adjust`).send({ delta: 1 })).status).toBe(400)
    const ok = await owner.post(`/api/customers/${customer.id}/adjust`).send({ delta: 2, note: 'wrong scan' })
    expect(ok.body.customer.credits).toBe(2)
    expect((await owner.post(`/api/customers/${customer.id}/adjust`).send({ delta: -5, note: 'too much' })).status).toBe(409)
  })
})

describe('undo', () => {
  it('reverses a recent entry once, and hides it from today', async () => {
    const agent = await ownerAgent()
    const customer = await createCustomer(agent)
    await agent.post(`/api/customers/${customer.id}/topup`).send({ packId: 1 })
    const entry = await agent.post(`/api/customers/${customer.id}/entry`).send({ count: 2 })
    const tid = entry.body.transaction.id
    expect((await agent.get('/api/stats/today')).body.entries).toBe(2)

    const undo = await agent.post(`/api/customers/${customer.id}/undo/${tid}`)
    expect(undo.status).toBe(200)
    expect(undo.body.customer.credits).toBe(5)
    expect(undo.body.transaction).toMatchObject({ type: 'ADJUST', delta: 2, reversalOfId: tid })

    expect((await agent.post(`/api/customers/${customer.id}/undo/${tid}`)).status).toBe(409)
    expect((await agent.get('/api/stats/today')).body.entries).toBe(0)
  })

  it('does not expose money to staff', async () => {
    const owner = await ownerAgent()
    const customer = await createCustomer(owner)
    await owner.post(`/api/customers/${customer.id}/topup`).send({ packId: 1 })
    await createUser({ username: 'ravi' })
    const staff = await loginAs('ravi')
    expect((await staff.get('/api/stats/today?money=1')).body.money).toBeUndefined()
    expect((await owner.get('/api/stats/today')).body.money).toBeUndefined()
    expect((await owner.get('/api/stats/today?money=1')).body.money).toBe(450)
  })
})
