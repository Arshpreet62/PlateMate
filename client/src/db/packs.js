import { CreditError, customPrice, getSetting } from './credits.js'
import { db } from './schema.js'

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

export async function listPacks({ all = false } = {}) {
  const packs = await db.packs.toArray()
  return packs
    .filter((p) => all || p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
}

export async function createPack(body) {
  const { data, error } = validatePack(body ?? {})
  if (error) throw new CreditError(400, error)
  const last = (await db.packs.toArray()).reduce((max, p) => Math.max(max, p.sortOrder ?? 0), 0)
  const pack = { active: true, sortOrder: last + 1, ...data }
  pack.id = await db.packs.add(pack)
  return pack
}

export async function updatePack(id, body) {
  const { data, error } = validatePack(body ?? {}, { partial: true })
  if (error) throw new CreditError(400, error)
  await db.packs.update(Number(id), data)
  return db.packs.get(Number(id))
}

export async function deletePack(id) {
  await db.packs.delete(Number(id))
}

export { getSetting }

export async function updateSettings(body = {}) {
  const data = {}
  if (body.currency !== undefined) data.currency = String(body.currency).trim() || '₹'
  for (const key of ['customThreshold', 'customPriceBelow', 'customPriceAtAbove']) {
    if (body[key] === undefined) continue
    const n = Number(body[key])
    if (!Number.isInteger(n) || n < 0) throw new CreditError(400, `${key} must be a whole number`)
    data[key] = n
  }
  const current = await getSetting()
  const next = { ...current, ...data }
  await db.settings.put(next)
  return next
}

export async function quote(credits) {
  const n = Number(credits)
  if (!Number.isInteger(n) || n < 1) throw new CreditError(400, 'credits must be a positive whole number')
  return { credits: n, price: customPrice(await getSetting(), n) }
}
