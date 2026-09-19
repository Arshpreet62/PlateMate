import { Badge, Button, Card, Group, Stack, Text, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { Html5Qrcode } from 'html5-qrcode'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { Layout } from '../components/Layout.jsx'
import { Stepper } from '../components/Stepper.jsx'

const REGION_ID = 'qr-reader'

export function Scan() {
  const scannerRef = useRef(null)
  const [phase, setPhase] = useState('starting') // starting | scanning | checking | found | invalid | error
  const [customer, setCustomer] = useState(null)
  const [message, setMessage] = useState('')
  const [count, setCount] = useState(1)
  const [busy, setBusy] = useState(false)

  const stop = async () => {
    const s = scannerRef.current
    if (!s) return
    scannerRef.current = null
    try {
      if (s.isScanning) await s.stop()
      s.clear()
    } catch {
      // camera already stopped
    }
  }

  const start = async () => {
    setCustomer(null)
    setCount(1)
    setPhase('starting')
    await stop()
    const scanner = new Html5Qrcode(REGION_ID, { verbose: false })
    scannerRef.current = scanner
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: (w, h) => { const s = Math.min(w, h) * 0.75; return { width: s, height: s } } },
        async (decoded) => {
          if (scannerRef.current !== scanner) return
          await stop()
          setPhase('checking')
          try {
            const found = await api('/scan', { method: 'POST', body: { code: decoded } })
            setCustomer(found)
            setPhase('found')
          } catch (err) {
            setMessage(err.status === 404 ? 'Not a valid customer code' : err.message)
            setPhase('invalid')
          }
        },
        () => {},
      )
      if (scannerRef.current !== scanner) {
        // superseded while starting (unmount or restart); release this camera
        await scanner.stop().catch(() => {})
        return
      }
      setPhase('scanning')
    } catch (err) {
      if (scannerRef.current !== scanner) return
      scannerRef.current = null
      setMessage(String(err?.message || err || 'Could not start the camera'))
      setPhase('error')
    }
  }

  useEffect(() => {
    start()
    return () => { stop() }
  }, [])

  const useEntries = async () => {
    setBusy(true)
    try {
      const r = await api(`/customers/${customer.id}/entry`, { method: 'POST', body: { count } })
      notifications.show({ color: 'green', message: `${count} ${count === 1 ? 'entry' : 'entries'} used. ${r.customer.credits} left.` })
      setCustomer({ ...customer, credits: r.customer.credits })
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const showCamera = phase === 'starting' || phase === 'scanning'

  return (
    <Layout title="Scan QR">
      <Stack>
        <div
          id={REGION_ID}
          style={{ width: '100%', borderRadius: 12, overflow: 'hidden', display: showCamera ? 'block' : 'none' }}
        />
        {phase === 'starting' && <Text ta="center" c="dimmed">Starting camera…</Text>}
        {phase === 'scanning' && <Text ta="center" c="dimmed">Point the camera at the customer's QR code</Text>}
        {phase === 'checking' && <Text ta="center" c="dimmed">Checking…</Text>}

        {(phase === 'invalid' || phase === 'error') && (
          <Card withBorder radius="lg" padding="lg">
            <Stack align="center">
              <Title order={4} c="red" ta="center">{phase === 'error' ? 'Camera problem' : 'Not recognised'}</Title>
              <Text ta="center" c="dimmed">{message}</Text>
              <Button size="xl" fullWidth onClick={start}>Try again</Button>
              <Button variant="subtle" component={Link} to="/">Search by name instead</Button>
            </Stack>
          </Card>
        )}

        {phase === 'found' && customer && (
          <Card withBorder radius="lg" padding="lg">
            <Stack>
              <Group justify="space-between" align="flex-start">
                <div>
                  <Title order={3}>{customer.name}</Title>
                  <Text c="dimmed">{customer.phone || 'No phone yet'}</Text>
                </div>
                <Badge size="xl" color={customer.credits > 0 ? 'green' : 'red'} variant="light">
                  {customer.credits} left
                </Badge>
              </Group>
              <Text size="sm" c="dimmed" ta="center">Check this is the right person, then choose how many are eating.</Text>
              <Stepper value={count} onChange={setCount} max={Math.max(1, customer.credits)} />
              <Button size="xl" loading={busy} disabled={customer.credits < count} onClick={useEntries}>
                Use {count} {count === 1 ? 'entry' : 'entries'}
              </Button>
              {customer.credits < 1 && <Text c="red" ta="center" size="sm">No entries left — add a pack first</Text>}
              <Group grow>
                <Button variant="light" component={Link} to={`/customers/${customer.id}`}>Open profile</Button>
                <Button variant="default" onClick={start}>Scan next</Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    </Layout>
  )
}
