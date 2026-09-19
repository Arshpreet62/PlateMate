import { Button, Center, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconDownload, IconShare } from '@tabler/icons-react'
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react'
import { useRef, useState } from 'react'

function fileNameFor(name) {
  return `${name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'customer'}-buffet-pass.png`
}

// Compose a shareable card: name on top, QR in the middle, label below.
async function makeImage(sourceCanvas, name) {
  const W = 720, H = 900
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#1f1a17'
  ctx.textAlign = 'center'
  ctx.font = 'bold 44px system-ui, sans-serif'
  ctx.fillText(name, W / 2, 90, W - 80)
  ctx.drawImage(sourceCanvas, (W - 560) / 2, 140, 560, 560)
  ctx.fillStyle = '#6b6360'
  ctx.font = '28px system-ui, sans-serif'
  ctx.fillText('Show this at the counter', W / 2, 770)
  ctx.font = 'bold 28px system-ui, sans-serif'
  ctx.fillStyle = '#e8590c'
  ctx.fillText('Buffet Pass', W / 2, 830)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  return new File([blob], fileNameFor(name), { type: 'image/png' })
}

export function QrPass({ customer, hint }) {
  const [busy, setBusy] = useState(false)
  const canvasRef = useRef(null)
  const canShare = typeof navigator.share === 'function'

  const share = async () => {
    setBusy(true)
    try {
      const file = await makeImage(canvasRef.current, customer.name)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${customer.name} — Buffet Pass` })
      } else {
        const url = URL.createObjectURL(file)
        const a = document.createElement('a')
        a.href = url
        a.download = file.name
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 5000)
        notifications.show({ color: 'blue', message: 'Saved as an image — share it from your gallery' })
      }
    } catch (err) {
      if (err?.name !== 'AbortError') notifications.show({ color: 'red', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Stack align="center">
      <Center bg="white" p="lg" style={{ borderRadius: 20, boxShadow: '0 8px 24px rgba(31,26,23,.08)' }}>
        <QRCodeSVG value={customer.qr} size={240} level="M" />
      </Center>
      <div style={{ display: 'none' }}>
        <QRCodeCanvas ref={canvasRef} value={customer.qr} size={560} level="M" marginSize={2} />
      </div>
      <Text ta="center" c="dimmed" px="md" size="sm">
        {hint ?? "Share it to the customer's WhatsApp, or let them take a photo. They show it at the counter."}
      </Text>
      <Button size="xl" fullWidth leftSection={canShare ? <IconShare size={22} /> : <IconDownload size={22} />} loading={busy} onClick={share}>
        {canShare ? 'Share pass' : 'Save pass image'}
      </Button>
    </Stack>
  )
}
