import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import prisma from '../src/db.js'
import { app, createCustomer, createUser, loginAs, ownerAgent, resetDb } from './helpers.js'

beforeEach(resetDb)

describe('auth and roles', () => {
  it('blocks unauthenticated access', async () => {
    expect((await request(app).get('/api/customers')).status).toBe(401)
    expect((await request(app).get('/api/health')).status).toBe(200)
  })

  it('rejects wrong password and inactive users', async () => {
    await createUser({ username: 'ravi' })
    expect((await request(app).post('/api/login').send({ username: 'ravi', password: 'wrong' })).status).toBe(401)
    const agent = await loginAs('ravi')
    expect((await agent.get('/api/me')).body.username).toBe('ravi')
    await prisma.user.update({ where: { username: 'ravi' }, data: { active: false } })
    expect((await agent.get('/api/me')).status).toBe(401)
  })

  it('lets staff sell and deduct but not edit packs', async () => {
    await ownerAgent()
    await createUser({ username: 'ravi' })
    const staff = await loginAs('ravi')
    const customer = await createCustomer(staff)
    expect((await staff.post(`/api/customers/${customer.id}/topup`).send({ packId: 2 })).status).toBe(200)
    expect((await staff.patch('/api/packs/1').send({ price: 500 })).status).toBe(403)
    expect((await staff.patch('/api/settings').send({ customPriceBelow: 100 })).status).toBe(403)
  })

  it('requires name and phone for customers', async () => {
    const owner = await ownerAgent()
    expect((await owner.post('/api/customers').send({ name: 'X' })).status).toBe(400)
    expect((await owner.post('/api/customers').send({ phone: '1' })).status).toBe(400)
  })
})

describe('QR', () => {
  it('signs, verifies, and revokes codes', async () => {
    const owner = await ownerAgent()
    const customer = await createCustomer(owner)
    const { qr } = (await owner.get(`/api/customers/${customer.id}`)).body
    expect(qr.startsWith(`buffet:${customer.id}:`)).toBe(true)

    const good = await owner.post('/api/scan').send({ code: qr })
    expect(good.status).toBe(200)
    expect(good.body.id).toBe(customer.id)

    expect((await owner.post('/api/scan').send({ code: qr.slice(0, -1) + 'x' })).status).toBe(404)
    expect((await owner.post('/api/scan').send({ code: 'hello' })).status).toBe(404)

    const regen = await owner.post(`/api/customers/${customer.id}/regenerate-qr`)
    expect((await owner.post('/api/scan').send({ code: qr })).status).toBe(404)
    expect((await owner.post('/api/scan').send({ code: regen.body.qr })).status).toBe(200)
  })
})

describe('today stats', () => {
  it('sums entries and money since midnight', async () => {
    const owner = await ownerAgent()
    const customer = await createCustomer(owner)
    await owner.post(`/api/customers/${customer.id}/topup`).send({ packId: 1 })
    await owner.post(`/api/customers/${customer.id}/entry`).send({ count: 2 })
    const res = await owner.get('/api/stats/today')
    expect(res.body).toMatchObject({ entries: 2, money: 450 })
  })
})
