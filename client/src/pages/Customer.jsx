import { Badge, Button, Card, Center, Group, Loader, Modal, NumberInput, Stack, Text, Textarea, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { Layout } from '../components/Layout.jsx'
import { QrModal } from '../components/QrModal.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { TopupModal } from '../components/TopupModal.jsx'
import { useMoney } from '../settings.jsx'

const typeLabel = { TOPUP: 'Added', ENTRY: 'Used', ADJUST: 'Adjusted' }
const typeColor = { TOPUP: 'green', ENTRY: 'orange', ADJUST: 'blue' }

function formatTime(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function Customer() {
  const { id } = useParams()
  const { user } = useAuth()
  const money = useMoney()
  const [customer, setCustomer] = useState(null)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null)
  const [count, setCount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [adjust, setAdjust] = useState({ delta: 1, note: '' })
  const [edit, setEdit] = useState({ name: '', phone: '', notes: '' })

  const load = useCallback(() => {
    api(`/customers/${id}`).then(setCustomer).catch((e) => setError(e.message))
  }, [id])

  useEffect(load, [load])

  const run = async (fn, successMessage) => {
    setBusy(true)
    try {
      const result = await fn()
      notifications.show({ color: 'green', message: successMessage(result) })
      setModal(null)
      load()
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const useEntries = () =>
    run(
      () => api(`/customers/${id}/entry`, { method: 'POST', body: { count } }),
      (r) => `${count} ${count === 1 ? 'entry' : 'entries'} used. ${r.customer.credits} left.`,
    )

  const submitAdjust = () =>
    run(
      () => api(`/customers/${id}/adjust`, { method: 'POST', body: adjust }),
      (r) => `Balance is now ${r.customer.credits}.`,
    )

  const submitEdit = () =>
    run(
      () => api(`/customers/${id}`, { method: 'PATCH', body: edit }),
      () => 'Details saved.',
    )

  if (error) {
    return (
      <Layout>
        <Text c="red" ta="center" py="xl">{error}</Text>
      </Layout>
    )
  }
  if (!customer) {
    return (
      <Layout>
        <Center py="xl"><Loader /></Center>
      </Layout>
    )
  }

  const canUse = customer.credits >= count

  return (
    <Layout title={customer.name}>
      <Stack>
        <Card withBorder radius="lg" padding="lg">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <div>
              <Title order={3}>{customer.name}</Title>
              <Text c="dimmed">{customer.phone || 'No phone yet'}</Text>
              {customer.notes && <Text size="sm" mt="xs">{customer.notes}</Text>}
            </div>
            <Button
              variant="subtle"
              size="sm"
              onClick={() => {
                setEdit({ name: customer.name, phone: customer.phone ?? '', notes: customer.notes ?? '' })
                setModal('edit')
              }}
            >
              Edit
            </Button>
          </Group>
          <Center mt="md">
            <Stack gap={0} align="center">
              <Text fw={800} style={{ fontSize: 64, lineHeight: 1 }} c={customer.credits > 0 ? 'green' : 'red'}>
                {customer.credits}
              </Text>
              <Text c="dimmed">entries left</Text>
            </Stack>
          </Center>
        </Card>

        <Button size="xl" onClick={() => { setCount(1); setModal('use') }} disabled={customer.credits < 1}>
          Use entry
        </Button>
        <Group grow>
          <Button variant="light" onClick={() => setModal('topup')}>Add entries</Button>
          <Button variant="light" color="gray" onClick={() => setModal('qr')}>Show QR</Button>
        </Group>
        {user.role === 'OWNER' && (
          <Button variant="subtle" color="blue" size="md" onClick={() => { setAdjust({ delta: 1, note: '' }); setModal('adjust') }}>
            Adjust balance (fix a mistake)
          </Button>
        )}

        <Title order={5} mt="md">History</Title>
        {customer.transactions.length === 0 ? (
          <Text c="dimmed" size="sm">Nothing yet.</Text>
        ) : (
          <Stack gap="xs">
            {customer.transactions.map((t) => (
              <Card key={t.id} withBorder padding="sm" radius="md">
                <Group justify="space-between" wrap="nowrap">
                  <div>
                    <Group gap="xs">
                      <Badge color={typeColor[t.type]} variant="light">{typeLabel[t.type]}</Badge>
                      <Text fw={600}>{t.delta > 0 ? '+' : ''}{t.delta}</Text>
                      {t.packName && <Text size="sm" c="dimmed">{t.packName}</Text>}
                    </Group>
                    <Text size="xs" c="dimmed">
                      {formatTime(t.createdAt)} · {t.performedBy.name}{t.note ? ` · ${t.note}` : ''}
                    </Text>
                  </div>
                  {t.amount != null && <Text fw={600}>{money(t.amount)}</Text>}
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>

      <Modal opened={modal === 'use'} onClose={() => setModal(null)} title="How many people?" centered>
        <Stack>
          <Stepper value={count} onChange={setCount} max={Math.max(1, customer.credits)} />
          {!canUse && <Text c="red" ta="center" size="sm">Only {customer.credits} left</Text>}
          <Button size="xl" loading={busy} disabled={!canUse} onClick={useEntries}>
            Confirm — use {count} {count === 1 ? 'entry' : 'entries'}
          </Button>
          <Text c="dimmed" size="sm" ta="center">{customer.name} will have {customer.credits - count} left</Text>
        </Stack>
      </Modal>

      <TopupModal opened={modal === 'topup'} onClose={() => setModal(null)} customer={customer} onDone={load} />

      <QrModal
        opened={modal === 'qr'}
        onClose={() => setModal(null)}
        customer={customer}
        onRegenerated={(qr) => setCustomer({ ...customer, qr })}
      />

      <Modal opened={modal === 'adjust'} onClose={() => setModal(null)} title="Adjust balance" centered>
        <Stack>
          <Text size="sm" c="dimmed">Use this to fix mistakes. Positive adds entries, negative removes them.</Text>
          <NumberInput label="Change by" allowDecimal={false} value={adjust.delta} onChange={(v) => setAdjust({ ...adjust, delta: Number(v) || 0 })} />
          <TextInput label="Reason (required)" value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.currentTarget.value })} />
          <Button loading={busy} onClick={submitAdjust} disabled={!adjust.delta || !adjust.note.trim()} color="blue">
            Apply
          </Button>
        </Stack>
      </Modal>

      <Modal opened={modal === 'edit'} onClose={() => setModal(null)} title="Edit details" centered>
        <Stack>
          <TextInput label="Name" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.currentTarget.value })} />
          <TextInput label="Phone" type="tel" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.currentTarget.value })} />
          <Textarea label="Notes" autosize minRows={2} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.currentTarget.value })} />
          <Button loading={busy} onClick={submitEdit}>Save</Button>
        </Stack>
      </Modal>
    </Layout>
  )
}
