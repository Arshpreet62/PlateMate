import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from './generated/prisma/client.ts'

const connectionString = process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL

// Module-level singleton so serverless invocations reuse the pool
const prisma = globalThis.__prisma ?? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
globalThis.__prisma = prisma

export default prisma
