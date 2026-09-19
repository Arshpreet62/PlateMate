import 'dotenv/config'

process.env.PRISMA_DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.SESSION_SECRET ||= 'test-session-secret'
process.env.QR_SECRET ||= 'test-qr-secret'
process.env.NODE_ENV = 'test'
