import { Router } from 'express'
import prisma from './db.js'
import { parseQrCode, verifyQr } from './qr.js'

export const scanRouter = Router()

scanRouter.post('/', async (req, res) => {
  const parsed = parseQrCode(req.body?.code)
  if (!parsed) return res.status(404).json({ error: 'Not a valid customer code' })
  const customer = await prisma.customer.findUnique({
    where: { id: parsed.customerId },
    select: { id: true, name: true, phone: true, credits: true, qrVersion: true },
  })
  if (!customer || !verifyQr(customer, parsed.sig)) return res.status(404).json({ error: 'Not a valid customer code' })
  const { qrVersion, ...publicCustomer } = customer
  res.json(publicCustomer)
})
