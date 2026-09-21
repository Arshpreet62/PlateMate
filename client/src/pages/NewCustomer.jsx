import { Alert, Anchor, Button, Card, Collapse, Group, Stack, Text, Textarea, TextInput, Title } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle, IconCheck } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BalancePill, CustomerAvatar, customerHint } from '../components/CustomerBits.jsx'
import { Layout } from '../components/Layout.jsx'
import { PlanPicker } from '../components/PlanPicker.jsx'
import { QrPass } from '../components/QrPass.jsx'
import { topup } from '../db/credits.js'
import { createCustomer, getCustomer } from '../db/customers.js'
import { normaliseName } from '../db/schema.js'
import { vibrate } from '../entries.jsx'
import { useAction } from '../useAction.js'
import { useNameCheck } from '../useNameCheck.js'

const STEPS = ['Name', 'Plan', 'QR pass']

function Progress({ step }) {
  return (
    <Group gap="xs" justify="center">
      {STEPS.map((label, i) => {
        const state = i < step ? 'done' : i === step ? 'current' : 'todo'
        return (
          <Group key={label} gap={6} wrap="nowrap">
            <div className="step-dot" data-state={state}>
              {state === 'done' ? <IconCheck size={15} stroke={3} /> : i + 1}
            </div>
            <Text size="sm" fw={state === 'current' ? 800 : 500} c={state === 'todo' ? 'dimmed' : undefined}>{label}</Text>
            {i < STEPS.length - 1 && <div className="step-line" />}
          </Group>
        )
      })}
    </Group>
  )
}

function ExistingCustomer({ customer }) {
  return (
    <Card withBorder padding="sm" component={Link} to={`/customers/${customer.id}`}>
      <Group wrap="nowrap" gap="sm">
        <CustomerAvatar name={customer.name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="sm">{customer.name}</Text>
          <Text size="xs" c="dimmed" lineClamp={1}>{customerHint(customer)}</Text>
        </div>
        <BalancePill credits={customer.credits} size="md" />
      </Group>
    </Card>
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
  const [plan, setPlan] = useState(null)
  const [created, setCreated] = useState(null) // customer record once the create succeeded
  const { busy, run } = useAction()

  const cleanName = normaliseName(name)
  // Checked as they type, so a clash never gets as far as the plan step.
  const { taken, similar } = useNameCheck(cleanName)

  const createAndStart = () => {
    if (!plan) return
    return run(async () => {
      try {
        let customer = created
        if (!customer) {
          customer = await createCustomer({ name: cleanName, phone, notes })
          setCreated(customer)
        }
        const result = await topup(customer.id, plan.packId ? { packId: plan.packId } : { credits: plan.credits })
        const full = await getCustomer(customer.id)
        setCreated({ ...full, credits: result.customer.credits })
        vibrate()
        setStep(2)
      } catch (err) {
        if (err.status === 409 && !created) setStep(0)
        notifications.show({ color: 'red', message: err.message, autoClose: 6000 })
      }
    })
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
              error={taken ? `${taken.name} already exists` : null}
              onChange={(e) => setName(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && cleanName && !taken) setStep(1) }}
            />

            {taken && (
              <Alert color="yellow" icon={<IconAlertTriangle size={20} />} title="That name is taken">
                <Stack gap="xs" mt="xs">
                  <Text size="sm">Same person? Open them instead:</Text>
                  <ExistingCustomer customer={taken} />
                  <Text size="sm">Different person? Add a surname or nickname, like "{taken.name} (bank)".</Text>
                </Stack>
              </Alert>
            )}

            {!taken && similar.length > 0 && (
              <Stack gap={6}>
                <Text size="sm" c="dimmed">
                  {similar.length === 1 ? 'Someone with a similar name already exists:' : 'People with similar names already exist:'}
                </Text>
                {similar.map((c) => <ExistingCustomer key={c.id} customer={c} />)}
              </Stack>
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
            <Button size="xl" disabled={!cleanName || !!taken} onClick={() => setStep(1)}>
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
            <PlanPicker value={plan} onChange={setPlan} currentCredits={0} />
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
