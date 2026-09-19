import { Router } from 'express'
import { requireOwner } from './auth.js'
import { adjust, topup, useEntries } from './credits.js'
import prisma from './db.js'
import { qrCode } from './qr.js'

export const customersRouter = Router()

const summary = { id: true, name: true, phone: true, credits: true }

function validateDetails(body, { partial = false } = {}) {
  const out = {}
  if (!partial || body.name !== undefined) {
    const name = String(body.name ?? '').trim()
    if (!name) return { error: 'Name is required' }
    out.name = name
  }
  if (!partial || body.phone !== undefined) {
    const phone = String(body.phone ?? '').replace(/\s+/g, '')
    if (!phone) return { error: 'Phone number is required' }
    out.phone = phone
  }
  if (body.notes !== undefined) out.notes = body.notes ? String(body.notes).trim() : null
  return { data: out }
}

customersRouter.get('/', async (req, res) => {
  const q = String(req.query.q ?? '').trim()
  const customers = await prisma.customer.findMany({
    where: q
      ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] }
      : undefined,
    select: summary,
    orderBy: q ? { name: 'asc' } : { createdAt: 'desc' },
    take: 20,
  })
  res.json(customers)
})

customersRouter.post('/', async (req, res) => {
  const { data, error } = validateDetails(req.body ?? {})
  if (error) return res.status(400).json({ error })
  const customer = await prisma.customer.create({ data, select: summary })
  res.status(201).json(customer)
})

customersRouter.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { performedBy: { select: { name: true } } },
      },
    },
  })
  if (!customer) return res.status(404).json({ error: 'Customer not found' })
  res.json({ ...customer, qr: qrCode(customer) })
})

customersRouter.patch('/:id', async (req, res) => {
  const { data, error } = validateDetails(req.body ?? {}, { partial: true })
  if (error) return res.status(400).json({ error })
  const customer = await prisma.customer.update({ where: { id: req.params.id }, data, select: summary })
  res.json(customer)
})

customersRouter.post('/:id/topup', async (req, res) => {
  const result = await topup(req.params.id, req.user.id, req.body ?? {})
  res.json(result)
})

customersRouter.post('/:id/entry', async (req, res) => {
  const result = await useEntries(req.params.id, req.user.id, req.body ?? {})
  res.json(result)
})

customersRouter.post('/:id/adjust', requireOwner, async (req, res) => {
  const result = await adjust(req.params.id, req.user.id, req.body ?? {})
  res.json(result)
})

customersRouter.post('/:id/regenerate-qr', requireOwner, async (req, res) => {
  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: { qrVersion: { increment: 1 } },
  })
  res.json({ qr: qrCode(customer) })
})
