import bcrypt from 'bcryptjs'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import prisma from './db.js'

export const authRouter = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' },
})

function publicUser(user) {
  return { id: user.id, name: user.name, username: user.username, role: user.role }
}

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' })

  const user = await prisma.user.findUnique({ where: { username: String(username).trim().toLowerCase() } })
  const ok = user && user.active && (await bcrypt.compare(String(password), user.passwordHash))
  if (!ok) return res.status(401).json({ error: 'Wrong username or password' })

  req.session.userId = user.id
  res.json(publicUser(user))
})

authRouter.post('/logout', (req, res) => {
  req.session = null
  res.json({ ok: true })
})

authRouter.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user))
})

export async function requireAuth(req, res, next) {
  const userId = req.session?.userId
  if (!userId) return res.status(401).json({ error: 'Not logged in' })
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || !user.active) {
    req.session = null
    return res.status(401).json({ error: 'Not logged in' })
  }
  req.user = user
  next()
}

export function requireOwner(req, res, next) {
  if (req.user?.role !== 'OWNER') return res.status(403).json({ error: 'Owner only' })
  next()
}
