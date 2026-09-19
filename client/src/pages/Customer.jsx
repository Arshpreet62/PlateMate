import { ActionIcon, Box, Button, Card, Center, Group, Loader, Menu, Modal, NumberInput, Stack, Text, Textarea, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAdjustments, IconDotsVertical, IconPencil, IconPlus, IconQrcode } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'
import { BalancePill, CustomerAvatar } from '../components/CustomerBits.jsx'
import { Layout } from '../components/Layout.jsx'
import { QrModal } from '../components/QrModal.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { TopupModal } from '../components/TopupModal.jsx'
import { deductEntries } from '../entries.jsx'

const typeLabel = { TOPUP: 'Added', ENTRY: 'Ate', ADJUST: 'Adjusted' }
const typeColor = { TOPUP: 'green', ENTRY: 'brand', ADJUST: 'blue' }

function dayLabel(iso) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined })
}

function timeOf(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

function groupByDay(transactions) {
  const groups = []
  for (const t of transactions) {
    const label = dayLabel(t.createdAt)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(t)
    else groups.push({ label, items: [t] })
  }
  return groups
}

export function Customer() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const [customer, setCustomer] = useState(null)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(params.get('topup') ? 'topup' : null)
  const [count, setCount] = useState(1)
  const [busy, setBusy] = useState(false)
  const [adjust, setAdjust] = useState({ delta: 1, note: '' })
  const [edit, setEdit] = useState({ name: '', phone: '', notes: '' })

  const load = useCallback(() => {
    api(`/customers/${id}`).then(setCustomer).catch((e) => setError(e.message))
  }, [id])

  useEffect(load, [load])

  const closeModal = () => {
    setModal(null)
    if (params.get('topup')) setParams({}, { replace: true })
  }

  const run = async (fn, successMessage) => {
    setBusy(true)
    try {
      const result = await fn()
      notifications.show({ color: 'green', message: successMessage(result) })
      closeModal()
      load()
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const use = async () => {
    setBusy(true)
    await deductEntries(customer, count, { onChange: load })
    setCount(1)
    setBusy(false)
  }

  const submitAdjust = () =>
    run(() => api(`/customers/${id}/adjust`, { method: 'POST', body: adjust }), (r) => `Balance is now ${r.customer.credits}`)

  const submitEdit = () =>
    run(() => api(`/customers/${id}`, { method: 'PATCH', body: edit }), () => 'Details saved')

  if (error) {
    return (
      <Layout back>
        <Text c="red" ta="center" py="xl">{error}</Text>
      </Layout>
    )
  }
  if (!customer) {
    return (
      <Layout back>
        <Center py="xl"><Loader /></Center>
      </Layout>
    )
  }

  const canUse = customer.credits >= count && count >= 1

  const menu = (
    <Menu position="bottom-end" shadow="md" width={220}>
      <Menu.Target>
        <ActionIcon variant="light" color="gray" size="lg" aria-label="Options">
          <IconDotsVertical size={22} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<IconPencil size={18} />}
          onClick={() => {
            setEdit({ name: customer.name, phone: customer.phone ?? '', notes: customer.notes ?? '' })
            setModal('edit')
          }}
        >
          Edit details
        </Menu.Item>
        {user.role === 'OWNER' && (
          <Menu.Item leftSection={<IconAdjustments size={18} />} onClick={() => { setAdjust({ delta: 1, note: '' }); setModal('adjust') }}>
            Adjust balance
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  )

  return (
    <Layout title={customer.name} back action={menu}>
      <Stack gap="md">
        <Box className="hero" data-finished={customer.credits === 0 || undefined}>
          <Group wrap="nowrap" align="center" gap="md">
            <CustomerAvatar name={customer.name} size={56} />
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Title order={3} lineClamp={2} c="white">{customer.name}</Title>
              <Text className="dim" size="sm">{customer.phone || 'No phone yet'}{customer.notes ? ` · ${customer.notes}` : ''}</Text>
            </Box>
          </Group>
          <Group justify="space-between" align="flex-end" mt="lg">
            <div>
              <Text className="dim" size="sm" fw={600} tt="uppercase" lts={1}>Entries left</Text>
              <Text fw={900} style={{ fontSize: 56, lineHeight: 1 }} className="balance-pill">{customer.credits}</Text>
            </div>
            {customer.credits <= 2 && (
              <Text size="sm" fw={700} px="sm" py={4} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 999 }}>
                {customer.credits === 0 ? 'Plan finished' : 'Running low'}
              </Text>
            )}
          </Group>
        </Box>

        {customer.credits > 0 ? (
          <Card withBorder padding="md">
            <Stack gap="sm">
              <Text fw={600} ta="center" c="dimmed">How many people are eating?</Text>
              <Stepper value={count} onChange={setCount} min={1} max={customer.credits} />
              <Button size="xl" loading={busy} disabled={!canUse} onClick={use}>
                Use {count} {count === 1 ? 'entry' : 'entries'}
              </Button>
            </Stack>
          </Card>
        ) : (
          <Button size="xl" leftSection={<IconPlus size={22} />} onClick={() => setModal('topup')}>
            Renew plan
          </Button>
        )}

        <Group grow>
          <Button variant="light" leftSection={<IconPlus size={20} />} onClick={() => setModal('topup')}>Add a plan</Button>
          <Button variant="light" color="gray" leftSection={<IconQrcode size={20} />} onClick={() => setModal('qr')}>QR code</Button>
        </Group>

        <Box>
          <Text fw={700} size="lg" mb="xs">History</Text>
          {customer.transactions.length === 0 ? (
            <Text c="dimmed" size="sm">Nothing yet.</Text>
          ) : (
            groupByDay(customer.transactions).map((g) => (
              <Box key={g.label} mb="sm">
                <Text size="xs" c="dimmed" fw={600} tt="uppercase" mb={4}>{g.label}</Text>
                <Card withBorder padding={0}>
                  {g.items.map((t, i) => (
                    <Group key={t.id} wrap="nowrap" px="md" py="sm" style={{ borderTop: i ? '1px solid #f0ebe4' : undefined }}>
                      <Text fw={800} w={44} c={typeColor[t.type]} ta="right" className="balance-pill">
                        {t.delta > 0 ? '+' : ''}{t.delta}
                      </Text>
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} size="sm">
                          {typeLabel[t.type]}{t.packName ? ` · ${t.packName}` : ''}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                          {timeOf(t.createdAt)} · {t.performedBy.name}{t.note ? ` · ${t.note}` : ''}
                        </Text>
                      </Box>
                    </Group>
                  ))}
                </Card>
              </Box>
            ))
          )}
        </Box>
      </Stack>

      <TopupModal opened={modal === 'topup'} onClose={closeModal} customer={customer} onDone={load} />

      <QrModal opened={modal === 'qr'} onClose={closeModal} customer={customer} onRegenerated={(qr) => setCustomer({ ...customer, qr })} />

      <Modal opened={modal === 'adjust'} onClose={closeModal} title="Adjust balance">
        <Stack>
          <Text size="sm" c="dimmed">For fixing mistakes. Positive adds entries, negative removes them.</Text>
          <NumberInput label="Change by" allowDecimal={false} value={adjust.delta} onChange={(v) => setAdjust({ ...adjust, delta: Number(v) || 0 })} />
          <TextInput label="Reason (required)" value={adjust.note} onChange={(e) => setAdjust({ ...adjust, note: e.currentTarget.value })} />
          <Button loading={busy} onClick={submitAdjust} disabled={!adjust.delta || !adjust.note.trim()} color="blue">Apply</Button>
        </Stack>
      </Modal>

      <Modal opened={modal === 'edit'} onClose={closeModal} title="Edit details">
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
