import { db } from '../src/db/schema.js'
import { listPacks } from '../src/db/packs.js'
import { resetForTests } from '../src/db/schema.js'
import { createCustomer } from '../src/db/customers.js'

export { db, resetForTests }

export async function packNamed(name) {
  const packs = await listPacks()
  const pack = packs.find((p) => p.name === name)
  if (!pack) throw new Error(`no seeded pack called ${name}`)
  return pack
}

export async function customerWith(credits, name = 'Asha Rao') {
  const customer = await createCustomer({ name, phone: '9876543210' })
  if (credits) await db.customers.update(customer.id, { credits })
  return { ...customer, credits }
}
