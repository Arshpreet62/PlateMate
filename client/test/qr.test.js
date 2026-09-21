import { beforeEach, describe, expect, it } from 'vitest'
import { parseQrCode, qrCode, scan } from '../src/db/qr.js'
import { customerWith, resetForTests } from './helpers.js'

beforeEach(resetForTests)

describe('passes', () => {
  it('reads back the customer it was made for', async () => {
    const customer = await customerWith(5)
    const code = qrCode(customer)
    expect(parseQrCode(code)).toEqual({ customerId: customer.id })
    expect((await scan(code)).name).toBe(customer.name)
  })

  it('rejects anything else', async () => {
    expect(parseQrCode('hello')).toBeNull()
    expect(parseQrCode('buffet:')).toBeNull()
    expect(parseQrCode('')).toBeNull()
    await expect(scan('buffet:not-a-real-id')).rejects.toThrow(/Not a valid customer code/)
    await expect(scan('hello')).rejects.toThrow(/Not a valid customer code/)
  })
})
