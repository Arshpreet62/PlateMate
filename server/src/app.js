import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cookieSession from 'cookie-session'
import express from 'express'
import { authRouter, requireAuth } from './auth.js'
import { CreditError } from './credits.js'
import { customersRouter } from './customers.js'
import { packsRouter } from './packs.js'
import { scanRouter } from './scan.js'
import { statsRouter } from './stats.js'

const isProd = process.env.NODE_ENV === 'production'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json())

  const sessionSecret = process.env.SESSION_SECRET
  if (!sessionSecret) throw new Error('SESSION_SECRET is not set')
  app.use(
    cookieSession({
      name: 'buffet.sid',
      keys: [sessionSecret],
      httpOnly: true,
      sameSite: 'lax',
      secure: isProd,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    }),
  )

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
  app.use('/api', authRouter)
  app.use('/api/customers', requireAuth, customersRouter)
  app.use('/api/scan', requireAuth, scanRouter)
  app.use('/api/stats', requireAuth, statsRouter)
  app.use('/api', requireAuth, packsRouter)
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }))

  if (isProd) {
    const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')
    app.use(express.static(dist))
    app.get('*path', (req, res) => res.sendFile(path.join(dist, 'index.html')))
  }

  app.use((err, req, res, next) => {
    if (err instanceof CreditError) return res.status(err.status).json({ error: err.message })
    if (err.code === 'P2025') return res.status(404).json({ error: 'Not found' })
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' })
    console.error(err)
    res.status(500).json({ error: 'Something went wrong' })
  })

  return app
}
