import bcrypt from 'bcryptjs'
import request from 'supertest'
import { createApp } from '../src/app.js'
import prisma from '../src/db.js'

export const app = createApp()

export async function resetDb() {
  await prisma.transaction.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.pack.deleteMany()
  await prisma.user.deleteMany()
  await prisma.setting.upsert({ where: { id: 1 }, update: { customThreshold: 22, customPriceBelow: 90, customPriceAtAbove: 80 }, create: { id: 1 } })
  await prisma.pack.createMany({
    data: [
      { id: 1, name: 'Week plan', credits: 5, price: 450, sortOrder: 1 },
      { id: 2, name: 'Monthly pack', credits: 22, price: 1760, sortOrder: 2 },
    ],
  })
}

export async function createUser({ username, password = 'pass1234', role = 'STAFF', name = username }) {
  return prisma.user.create({ data: { name, username, role, passwordHash: await bcrypt.hash(password, 4) } })
}

export async function loginAs(username, password = 'pass1234') {
  const agent = request.agent(app)
  const res = await agent.post('/api/login').send({ username, password })
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`)
  return agent
}

export async function ownerAgent() {
  await createUser({ username: 'owner', role: 'OWNER' })
  return loginAs('owner')
}

export async function createCustomer(agent, data = { name: 'Asha Rao', phone: '9876543210' }) {
  const res = await agent.post('/api/customers').send(data)
  if (res.status !== 201) throw new Error(`create customer failed: ${JSON.stringify(res.body)}`)
  return res.body
}
