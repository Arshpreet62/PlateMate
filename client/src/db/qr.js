import { CreditError } from './credits.js'
import { db, newPassCode } from './schema.js'

const PREFIX = 'platemate'

// A pass points at an opaque passCode rather than the customer's id, which is
// what makes it replaceable: issue a new code and every photo of the old one
// stops working. There is no signature — with no server there is nothing to
// forge against, and an unknown code simply does not resolve.
export function qrCode(customer) {
  return `${PREFIX}:${customer.passCode}`
}

export function parseQrCode(code) {
  const parts = String(code ?? '').trim().split(':')
  if (parts.length !== 2 || parts[0] !== PREFIX || !parts[1]) return null
  return { passCode: parts[1] }
}

export async function scan(code) {
  const parsed = parseQrCode(code)
  const customer = parsed ? await db.customers.where('passCode').equals(parsed.passCode).first() : null
  if (!customer) throw new CreditError(404, 'Not a valid customer code')
  return customer
}

// Issues a new pass and kills the old one. Used when a customer's QR has been
// photographed by someone who should not have it.
export async function replacePass(customerId) {
  const passCode = newPassCode()
  const updated = await db.customers.update(customerId, { passCode })
  if (!updated) throw new CreditError(404, 'Customer not found')
  return { passCode, qr: `${PREFIX}:${passCode}` }
}
