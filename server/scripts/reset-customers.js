// Deletes every customer and all their transactions. Keeps users, packs, settings.
// Usage: PRISMA_DATABASE_URL="<direct url>" node scripts/reset-customers.js --yes
import prisma from '../src/db.js'

if (!process.argv.includes('--yes')) {
  console.error('Refusing to run without --yes')
  process.exit(1)
}

const before = { customers: await prisma.customer.count(), transactions: await prisma.transaction.count() }
await prisma.$transaction([prisma.transaction.deleteMany(), prisma.customer.deleteMany()])
const after = { customers: await prisma.customer.count(), transactions: await prisma.transaction.count() }
console.log('before', before, '-> after', after)
await prisma.$disconnect()
