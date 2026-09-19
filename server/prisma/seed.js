import bcrypt from 'bcryptjs'
import prisma from '../src/db.js'

const packs = [
  { name: 'Week plan', credits: 5, price: 450, sortOrder: 1 },
  { name: 'Monthly pack', credits: 22, price: 1760, sortOrder: 2 },
]

await prisma.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })

if ((await prisma.pack.count()) === 0) {
  await prisma.pack.createMany({ data: packs })
}

const username = process.env.SEED_OWNER_USERNAME
const password = process.env.SEED_OWNER_PASSWORD
if (username && password && !(await prisma.user.findUnique({ where: { username } }))) {
  await prisma.user.create({
    data: {
      name: process.env.SEED_OWNER_NAME || 'Owner',
      username,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'OWNER',
    },
  })
  console.log(`Created owner user "${username}"`)
}

console.log('Seed complete')
await prisma.$disconnect()
