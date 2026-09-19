import { Button, Modal, NumberInput, Stack, Text, TextInput } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useMoney } from '../settings.jsx'

export function TopupModal({ opened, onClose, customer, onDone }) {
  const money = useMoney()
  const [packs, setPacks] = useState([])
  const [choice, setChoice] = useState('')
  const [customCredits, setCustomCredits] = useState(1)
  const [quote, setQuote] = useState(null)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!opened) return
    setChoice('')
    setCustomCredits(1)
    setAmount('')
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
      notifications.show({ color: 'green', message: `Added ${creditsToAdd} entries. Balance: ${result.customer.credits}` })
      onDone(result)
      onClose()
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal opened={opened} onClose={onClose} title={`Add entries — ${customer.name}`} centered>
      <Stack>
        <Stack gap="xs">
          {packs.map((p) => (
            <Button
              key={p.id}
              variant={String(p.id) === choice ? 'filled' : 'default'}
              onClick={() => setChoice(String(p.id))}
              justify="space-between"
              rightSection={<Text fw={600}>{money(p.price)}</Text>}
            >
              {p.name} · {p.credits} entries
            </Button>
          ))}
          <Button variant={isCustom ? 'filled' : 'default'} onClick={() => setChoice('custom')}>
            Custom number of entries
          </Button>
        </Stack>

        {isCustom && (
          <NumberInput
            label="Number of entries"
            min={1}
            max={999}
            allowDecimal={false}
            value={customCredits}
            onChange={(v) => setCustomCredits(Number(v) || 0)}
          />
        )}

        {choice && (
          <>
            <NumberInput
              label="Amount taken"
              description={suggested != null && Number(amount) !== suggested ? `Standard price is ${money(suggested)}` : undefined}
              min={0}
              allowDecimal={false}
              value={amount}
              onChange={setAmount}
            />
            <TextInput label="Note (optional)" value={note} onChange={(e) => setNote(e.currentTarget.value)} />
            <Button loading={loading} onClick={submit} disabled={!creditsToAdd} fullWidth>
              Add {creditsToAdd} entries for {money(amount || 0)}
            </Button>
          </>
        )}
      </Stack>
    </Modal>
  )
}
