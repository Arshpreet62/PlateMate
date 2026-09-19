import 'dotenv/config'
import { execSync } from 'node:child_process'

export default function setup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL is not set')
  process.env.PRISMA_DATABASE_URL = url
  process.env.SESSION_SECRET ||= 'test-session-secret'
  process.env.QR_SECRET ||= 'test-qr-secret'
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env, PRISMA_DATABASE_URL: url } })
}
