import { beforeEach, describe, expect, it } from 'vitest'
import { parseQrCode, qrCode, replacePass, scan } from '../src/db/qr.js'
import { customerWith, db, resetForTests } from './helpers.js'

beforeEach(resetForTests)

describe('passes', () => {
  it('reads back the customer it was made for', async () => {
    const customer = await customerWith(5)
    const code = qrCode(customer)
    expect(parseQrCode(code)).toEqual({ passCode: customer.passCode })
    expect((await scan(code)).name).toBe(customer.name)
  })

  it('does not put the customer id in the code', async () => {
    const customer = await customerWith(5)
    expect(qrCode(customer)).not.toContain(customer.id)
  })

  it('gives every customer a different code', async () => {
    const a = await customerWith(0, 'One Person')
    const b = await customerWith(0, 'Two Person')
    expect(a.passCode).not.toBe(b.passCode)
  })

  it('rejects anything else', async () => {
    expect(parseQrCode('hello')).toBeNull()
    expect(parseQrCode('platemate:')).toBeNull()
    expect(parseQrCode('')).toBeNull()
    await expect(scan('platemate:not-a-real-code')).rejects.toThrow(/Not a valid customer code/)
    await expect(scan('hello')).rejects.toThrow(/Not a valid customer code/)
  })
})

describe('replacing a pass', () => {
  it('kills the old code and issues a working one', async () => {
    const customer = await customerWith(5)
    const old = qrCode(customer)
    const { qr } = await replacePass(customer.id)

    expect(qr).not.toBe(old)
    await expect(scan(old)).rejects.toThrow(/Not a valid customer code/)
    expect((await scan(qr)).id).toBe(customer.id)
  })

  it('leaves the balance and history alone', async () => {
    const customer = await customerWith(5)
    await replacePass(customer.id)
    expect((await db.customers.get(customer.id)).credits).toBe(5)
  })

  it('reports a customer that is not there', async () => {
    await expect(replacePass('nope')).rejects.toThrow(/Customer not found/)
  })
})
