import { Alert, Anchor, Button, Card, Collapse, Group, Stack, Text, Textarea, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { BalancePill, CustomerAvatar, customerHint } from '../components/CustomerBits.jsx'
import { Layout } from '../components/Layout.jsx'
import { PlanPicker } from '../components/PlanPicker.jsx'
import { QrPass } from '../components/QrPass.jsx'
import { vibrate } from '../entries.jsx'

const STEPS = ['Name', 'Plan', 'QR pass']

function Progress({ step }) {
  return (
    <Group gap="xs" justify="center">
      {STEPS.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo'
        return (
          <Group key={label} gap={6} wrap="nowrap">
            <div
              style={{
                width: 26, height: 26, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800,
                background: state === 'todo' ? '#eee8e0' : 'var(--brand-b)',
                color: state === 'todo' ? '#8a817a' : '#fff',
              }}
            >
              {state === 'done' ? <IconCheck size={15} stroke={3} /> : i + 1}
            </div>
            <Text size="sm" fw={state === 'current' ? 800 : 500} c={state === 'todo' ? 'dimmed' : undefined}>{label}</Text>
            {i < STEPS.length - 1 && <div style={{ width: 18, height: 2, background: '#e2dbd2', marginLeft: 4 }} />}
          </Group>
        )
      })}
    </Group>
  )
}

export function NewCustomer() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [step, setStep] = useState(0)
  const [name, setName] = useState(params.get('name') ?? '')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [moreOpen, setMoreOpen] = useState(false)
  const [nameError, setNameError] = useState(null)
  const [taken, setTaken] = useState(null)
  const [plan, setPlan] = useState(null)
  const [created, setCreated] = useState(null) // customer record once POST /customers succeeded
  const [busy, setBusy] = useState(false)

  const cleanName = name.trim().replace(/\s+/g, ' ')
  const nameIsTaken = taken && cleanName.toLowerCase() === taken.name.toLowerCase()

  const checkName = async () => {
    if (!cleanName) return setNameError('Name is required')
    setBusy(true)
    try {
      const same = await api(`/customers?q=${encodeURIComponent(cleanName)}&exact=1`)
      if (same.length) {
        setTaken({ name: cleanName, customers: same })
        return
      }
      setTaken(null)
      setStep(1)
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const createAndStart = async () => {
    if (!plan) return
    setBusy(true)
    try {
      let customer = created
      if (!customer) {
        customer = await api('/customers', { method: 'POST', body: { name: cleanName, phone, notes } })
        setCreated(customer)
      }
      const body = plan.packId ? { packId: plan.packId } : { credits: plan.credits }
      const result = await api(`/customers/${customer.id}/topup`, { method: 'POST', body })
      const full = await api(`/customers/${customer.id}`)
      setCreated({ ...full, credits: result.customer.credits })
      vibrate()
      setStep(2)
    } catch (err) {
      if (err.status === 409 && !created) {
        setTaken({ name: cleanName, customers: [] })
        setStep(0)
      }
      notifications.show({ color: 'red', message: err.message, autoClose: 6000 })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Layout title="New customer" back>
      <Stack gap="lg">
        <Progress step={step} />

        {step === 0 && (
          <Stack>
            <TextInput
              label="Full name"
              description="Name + surname or a nickname, so no two customers look the same"
              placeholder="e.g. Guru Sharma"
              size="xl"
              autoFocus={!params.get('name')}
              value={name}
              error={nameError || (nameIsTaken ? 'This exact name is already used' : null)}
              onChange={(e) => { setName(e.currentTarget.value); setNameError(null) }}
              onKeyDown={(e) => { if (e.key === 'Enter') checkName() }}
            />
            {taken && (
              <Alert color="yellow" icon={<IconAlertTriangle size={20} />} title={`"${taken.name}" already exists`}>
                <Stack gap="xs" mt="xs">
                  {taken.customers.length > 0 && <Text size="sm">Same person? Open them instead:</Text>}
                  {taken.customers.map((c) => (
                    <Card key={c.id} withBorder padding="sm" component={Link} to={`/customers/${c.id}`}>
                      <Group wrap="nowrap" gap="sm">
                        <CustomerAvatar name={c.name} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={600} size="sm">{c.name}</Text>
                          <Text size="xs" c="dimmed" lineClamp={1}>{customerHint(c)}</Text>
                        </div>
                        <BalancePill credits={c.credits} size="md" />
                      </Group>
                    </Card>
                  ))}
                  <Text size="sm">Different person? Add a surname or nickname, like "{taken.name} (bank)".</Text>
                </Stack>
              </Alert>
            )}
            <Anchor component="button" type="button" size="sm" c="dimmed" onClick={() => setMoreOpen((v) => !v)}>
              {moreOpen ? 'Hide phone & note' : 'Add phone or note (optional)'}
            </Anchor>
            <Collapse expanded={moreOpen}>
              <Stack gap="sm">
                <TextInput label="Phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} />
                <Textarea label="Note" placeholder="e.g. works at the bank next door" autosize minRows={2} value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
              </Stack>
            </Collapse>
            <Button size="xl" loading={busy} disabled={!cleanName || nameIsTaken} onClick={checkName}>
              Next: pick a plan
            </Button>
          </Stack>
        )}

        {step === 1 && (
          <Stack>
            <div>
              <Title order={3}>{cleanName}</Title>
              <Text c="dimmed" size="sm">Pick the plan they're paying for</Text>
            </div>
            <PlanPicker value={plan} onChange={setPlan} />
            <Button size="xl" loading={busy} disabled={!plan} onClick={createAndStart}>
              {created ? 'Try again' : plan ? `Start ${plan.name ?? `${plan.credits} entries`}` : 'Pick a plan'}
            </Button>
            {!created && (
              <Button variant="subtle" color="gray" onClick={() => setStep(0)}>Back to name</Button>
            )}
          </Stack>
        )}

        {step === 2 && created && (
          <Stack>
            <div style={{ textAlign: 'center' }}>
              <Title order={3}>{created.name} is set up</Title>
              <Text c="dimmed">{created.credits} entries on their pass</Text>
            </div>
            <QrPass customer={created} hint="This is their pass. Share it to their WhatsApp or let them take a photo — they show it at the counter." />
            <Button variant="light" size="lg" fullWidth onClick={() => navigate(`/customers/${created.id}`, { replace: true })}>
              Done
            </Button>
          </Stack>
        )}
      </Stack>
    </Layout>
  )
}
