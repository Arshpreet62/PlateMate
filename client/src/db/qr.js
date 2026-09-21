import { db } from './schema.js'

const PREFIX = 'buffet'

// The old server signed these with an HMAC so a forged code could not be
// redeemed. With no server, a pass is just a pointer: scanning looks the id up
// in this device's own database, and an unknown id is simply not recognised.
export function qrCode(customer) {
  return `${PREFIX}:${customer.id}`
}

export function parseQrCode(code) {
  const parts = String(code ?? '').trim().split(':')
  if (parts.length !== 2 || parts[0] !== PREFIX || !parts[1]) return null
  return { customerId: parts[1] }
}

export async function scan(code) {
  const parsed = parseQrCode(code)
  const customer = parsed ? await db.customers.get(parsed.customerId) : null
  if (!customer) {
    const err = new Error('Not a valid customer code')
    err.status = 404
    throw err
  }
  return customer
}
