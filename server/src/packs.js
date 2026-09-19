import { Router } from 'express'
import { requireOwner } from './auth.js'
import { customPrice, getSetting } from './credits.js'
import prisma from './db.js'

export const packsRouter = Router()

function validatePack(body, { partial = false } = {}) {
  const out = {}
  const fields = { name: 'string', credits: 'int', price: 'int', active: 'bool', sortOrder: 'int' }
  for (const [key, kind] of Object.entries(fields)) {
    const value = body[key]
    if (value === undefined) {
      if (!partial && (key === 'name' || key === 'credits' || key === 'price')) return { error: `${key} is required` }
      continue
    }
    if (kind === 'string') {
      const s = String(value).trim()
      if (!s) return { error: 'Name is required' }
      out[key] = s
    } else if (kind === 'int') {
      const n = Number(value)
      const min = key === 'sortOrder' ? 0 : key === 'price' ? 0 : 1
      if (!Number.isInteger(n) || n < min) return { error: `${key} must be a whole number` }
      out[key] = n
    } else {
      out[key] = Boolean(value)
    }
  }
  return { data: out }
}

packsRouter.get('/packs', async (req, res) => {
  const all = req.query.all === '1' && req.user.role === 'OWNER'
  const packs = await prisma.pack.findMany({
    where: all ? undefined : { active: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  })
  res.json(packs)
})

packsRouter.post('/packs', requireOwner, async (req, res) => {
  const { data, error } = validatePack(req.body ?? {})
  if (error) return res.status(400).json({ error })
  res.status(201).json(await prisma.pack.create({ data }))
})

packsRouter.patch('/packs/:id', requireOwner, async (req, res) => {
  const { data, error } = validatePack(req.body ?? {}, { partial: true })
  if (error) return res.status(400).json({ error })
  res.json(await prisma.pack.update({ where: { id: Number(req.params.id) }, data }))
})

packsRouter.get('/settings', async (req, res) => {
  res.json(await getSetting())
})

packsRouter.patch('/settings', requireOwner, async (req, res) => {
  const body = req.body ?? {}
  const data = {}
  if (body.currency !== undefined) data.currency = String(body.currency).trim() || '₹'
  for (const key of ['customThreshold', 'customPriceBelow', 'customPriceAtAbove']) {
    if (body[key] === undefined) continue
    const n = Number(body[key])
    if (!Number.isInteger(n) || n < 0) return res.status(400).json({ error: `${key} must be a whole number` })
    data[key] = n
  }
  await getSetting()
  res.json(await prisma.setting.update({ where: { id: 1 }, data }))
})

packsRouter.get('/quote', async (req, res) => {
  const credits = Number(req.query.credits)
  if (!Number.isInteger(credits) || credits < 1) return res.status(400).json({ error: 'credits must be a positive whole number' })
  const setting = await getSetting()
  res.json({ credits, price: customPrice(setting, credits) })
})
