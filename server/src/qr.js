import { createHmac, timingSafeEqual } from 'node:crypto'

const PREFIX = 'buffet'

function sign(customerId, qrVersion) {
  const secret = process.env.QR_SECRET
  if (!secret) throw new Error('QR_SECRET is not set')
  return createHmac('sha256', secret).update(`${customerId}:${qrVersion}`).digest('base64url').slice(0, 22)
}

export function qrCode(customer) {
  return `${PREFIX}:${customer.id}:${sign(customer.id, customer.qrVersion)}`
}

export function parseQrCode(code) {
  const parts = String(code ?? '').trim().split(':')
  if (parts.length !== 3 || parts[0] !== PREFIX) return null
  return { customerId: parts[1], sig: parts[2] }
}

export function verifyQr(customer, sig) {
  const expected = Buffer.from(sign(customer.id, customer.qrVersion))
  const given = Buffer.from(String(sig))
  return expected.length === given.length && timingSafeEqual(expected, given)
}
