import { Router } from 'express'
import prisma from './db.js'

export const statsRouter = Router()

function tzOffsetMinutes(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }).formatToParts(date).map((p) => [p.type, p.value]),
  )
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second)
  return (asUtc - date.getTime()) / 60000
}

export function startOfToday(timeZone = process.env.APP_TZ || 'Asia/Kolkata', now = new Date()) {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now).split('-').map(Number)
  const midnightGuess = Date.UTC(y, m - 1, d)
  return new Date(midnightGuess - tzOffsetMinutes(new Date(midnightGuess), timeZone) * 60000)
}

statsRouter.get('/today', async (req, res) => {
  const since = startOfToday()
  const visits = await prisma.transaction.findMany({
    where: { type: 'ENTRY', createdAt: { gte: since }, reversedBy: null },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      delta: true,
      createdAt: true,
      customer: { select: { id: true, name: true, credits: true } },
    },
  })
  const entries = visits.reduce((sum, v) => sum - v.delta, 0)
  const body = { entries, visits, since }
  if (req.user.role === 'OWNER' && req.query.money === '1') {
    const money = await prisma.transaction.aggregate({ where: { type: 'TOPUP', createdAt: { gte: since } }, _sum: { amount: true } })
    body.money = money._sum.amount ?? 0
  }
  res.json(body)
})
