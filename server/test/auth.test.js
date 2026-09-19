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

  it('requires a name but not a phone for customers', async () => {
    const owner = await ownerAgent()
    expect((await owner.post('/api/customers').send({ phone: '1' })).status).toBe(400)
    const noPhone = await owner.post('/api/customers').send({ name: 'X', phone: '  ' })
    expect(noPhone.status).toBe(201)
    expect(noPhone.body.phone).toBeNull()
    const added = await owner.patch(`/api/customers/${noPhone.body.id}`).send({ phone: '98765 43210' })
    expect(added.body.phone).toBe('9876543210')
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
    expect(res.body.entries).toBe(2)
    expect(res.body.visits).toHaveLength(1)
  })
})

describe('search', () => {
  it('returns last visit and supports exact name match for duplicate checks', async () => {
    const owner = await ownerAgent()
    const a = await createCustomer(owner, { name: 'Ravi Kumar', phone: '111' })
    await createCustomer(owner, { name: 'Ravi Kumaran', phone: '222' })
    await owner.post(`/api/customers/${a.id}/topup`).send({ packId: 1 })
    await owner.post(`/api/customers/${a.id}/entry`).send({})
    const loose = await owner.get('/api/customers?q=ravi')
    expect(loose.body).toHaveLength(2)
    expect(loose.body.find((c) => c.id === a.id).lastVisitAt).toBeTruthy()
    expect(loose.body.find((c) => c.id !== a.id).lastVisitAt).toBeNull()
    const exact = await owner.get('/api/customers?q=ravi%20kumar&exact=1')
    expect(exact.body).toHaveLength(1)
    expect(exact.body[0].id).toBe(a.id)
  })
})

describe('unique names', () => {
  it('refuses a second customer with the same name (case-insensitive) on create and rename', async () => {
    const owner = await ownerAgent()
    await createCustomer(owner, { name: 'Guru Sharma', phone: '1' })
    const dup = await owner.post('/api/customers').send({ name: 'guru sharma', phone: '2' })
    expect(dup.status).toBe(409)
    const other = await createCustomer(owner, { name: 'Guru Verma', phone: '3' })
    expect((await owner.patch(`/api/customers/${other.id}`).send({ name: 'GURU SHARMA' })).status).toBe(409)
    expect((await owner.patch(`/api/customers/${other.id}`).send({ name: 'Guru Verma' })).status).toBe(200)
  })
})
