import { Button, Collapse, Drawer, Group, NumberInput, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { vibrate } from '../entries.jsx'
import { useMoney } from '../settings.jsx'
import { Stepper } from './Stepper.jsx'

function Option({ selected, onClick, title, subtitle, price }) {
  return (
    <UnstyledButton
      onClick={onClick}
      px="md"
      py="sm"
      style={{
        borderRadius: 14,
        border: `2px solid ${selected ? 'var(--mantine-color-brand-6)' : '#ece6df'}`,
        background: selected ? 'var(--mantine-color-brand-0)' : '#fff',
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <div>
          <Text fw={700}>{title}</Text>
          {subtitle && <Text size="sm" c="dimmed">{subtitle}</Text>}
        </div>
        {price != null && <Text fw={800} size="lg">{price}</Text>}
      </Group>
    </UnstyledButton>
  )
}

export function TopupModal({ opened, onClose, customer, onDone }) {
  const money = useMoney()
  const [packs, setPacks] = useState([])
  const [choice, setChoice] = useState('')
  const [customCredits, setCustomCredits] = useState(5)
  const [quote, setQuote] = useState(null)
  const [amount, setAmount] = useState('')
  const [editAmount, setEditAmount] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!opened) return
    setChoice('')
    setCustomCredits(5)
    setAmount('')
    setEditAmount(false)
    setNote('')
    api('/packs').then(setPacks).catch(() => setPacks([]))
  }, [opened])

  const selectedPack = packs.find((p) => String(p.id) === choice)
  const isCustom = choice === 'custom'

  useEffect(() => {
    if (!isCustom || !customCredits) return setQuote(null)
    let cancelled = false
    api(`/quote?credits=${customCredits}`).then((q) => !cancelled && setQuote(q)).catch(() => {})
    return () => { cancelled = true }
  }, [isCustom, customCredits])

  const suggested = selectedPack ? selectedPack.price : quote?.price
  const creditsToAdd = selectedPack ? selectedPack.credits : isCustom ? customCredits : 0

  useEffect(() => {
    if (suggested != null) setAmount(suggested)
  }, [suggested])

  const submit = async () => {
    setLoading(true)
    try {
      const body = selectedPack ? { packId: selectedPack.id } : { credits: customCredits }
      if (amount !== '' && Number(amount) !== suggested) body.amount = Number(amount)
      if (note.trim()) body.note = note.trim()
      const result = await api(`/customers/${customer.id}/topup`, { method: 'POST', body })
      vibrate()
      notifications.show({ color: 'green', message: `${customer.name} now has ${result.customer.credits} entries` })
      onDone(result)
      onClose()
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer opened={opened} onClose={onClose} title={`Add entries — ${customer.name}`}>
      <Stack pb="md">
        {packs.map((p) => (
          <Option
            key={p.id}
            selected={String(p.id) === choice}
            onClick={() => setChoice(String(p.id))}
            title={p.name}
            subtitle={`${p.credits} entries`}
            price={money(p.price)}
          />
        ))}
        <Option
          selected={isCustom}
          onClick={() => setChoice('custom')}
          title="Custom number"
          subtitle="Any number of entries"
          price={isCustom && quote ? money(quote.price) : null}
        />

        <Collapse expanded={isCustom}>
          <Stack gap="xs" py="xs">
            <Text ta="center" c="dimmed" size="sm">Number of entries</Text>
            <Stepper value={customCredits} onChange={setCustomCredits} min={1} max={500} />
          </Stack>
        </Collapse>

        {choice && (
          <>
            {editAmount ? (
              <NumberInput
                label="Amount taken"
                description={suggested != null && Number(amount) !== suggested ? `Standard price is ${money(suggested)}` : undefined}
                min={0}
                allowDecimal={false}
                value={amount}
                onChange={setAmount}
              />
            ) : (
              <Group justify="center" gap="xs">
                <Text c="dimmed" size="sm">Taking {money(amount || 0)}</Text>
                <Button size="compact-sm" variant="subtle" onClick={() => setEditAmount(true)}>change</Button>
              </Group>
            )}
            <Collapse expanded={editAmount}>
              <TextInput label="Note (optional)" placeholder="e.g. discount, paid by UPI" value={note} onChange={(e) => setNote(e.currentTarget.value)} />
            </Collapse>
            <Button size="xl" loading={loading} onClick={submit} disabled={!creditsToAdd}>
              Add {creditsToAdd} entries
            </Button>
          </>
        )}
      </Stack>
    </Drawer>
  )
}
