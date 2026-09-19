import { Anchor, Collapse, Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { api } from '../api.js'
import { useMoney } from '../settings.jsx'
import { Stepper } from './Stepper.jsx'

function PlanCard({ selected, onClick, title, subtitle, price }) {
  return (
    <UnstyledButton
      onClick={onClick}
      px="md"
      py="md"
      className="plan-card"
      data-selected={selected || undefined}
    >
      <Group justify="space-between" wrap="nowrap">
        <div style={{ minWidth: 0 }}>
          <Text fw={800} size="lg">{title}</Text>
          <Text size="sm" c="dimmed">{subtitle}</Text>
        </div>
        <Group gap="xs" wrap="nowrap">
          {price != null && <Text fw={800} size="lg">{price}</Text>}
          <div className="plan-check">{selected && <IconCheck size={16} stroke={3} />}</div>
        </Group>
      </Group>
    </UnstyledButton>
  )
}

// Picks a pack or a custom entry count. Reports { packId } | { credits } | null via onChange.
export function PlanPicker({ value, onChange }) {
  const money = useMoney()
  const [packs, setPacks] = useState(null)
  const [showCustom, setShowCustom] = useState(Boolean(value?.credits))
  const [customCredits, setCustomCredits] = useState(value?.credits ?? 10)
  const [quote, setQuote] = useState(null)

  useEffect(() => {
    api('/packs').then(setPacks).catch(() => setPacks([]))
  }, [])

  const isCustom = value?.credits != null

  useEffect(() => {
    if (!isCustom) return
    let cancelled = false
    api(`/quote?credits=${customCredits}`).then((q) => !cancelled && setQuote(q)).catch(() => {})
    return () => { cancelled = true }
  }, [isCustom, customCredits])

  const pickCustom = (n) => {
    setCustomCredits(n)
    onChange({ credits: n })
  }

  if (packs === null) return <Text c="dimmed" ta="center">Loading plans…</Text>

  return (
    <Stack gap="sm">
      {packs.map((p) => (
        <PlanCard
          key={p.id}
          selected={value?.packId === p.id}
          onClick={() => onChange({ packId: p.id, name: p.name, credits: p.credits, price: p.price })}
          title={p.name}
          subtitle={`${p.credits} entries`}
          price={money(p.price)}
        />
      ))}
      {!showCustom ? (
        <Anchor component="button" type="button" size="sm" c="dimmed" ta="center" onClick={() => { setShowCustom(true); pickCustom(customCredits) }}>
          Other number of entries
        </Anchor>
      ) : (
        <PlanCard
          selected={isCustom}
          onClick={() => pickCustom(customCredits)}
          title="Other number"
          subtitle={isCustom ? `${customCredits} entries` : 'Choose how many'}
          price={isCustom && quote?.credits === customCredits ? money(quote.price) : null}
        />
      )}
      <Collapse expanded={isCustom}>
        <Stack gap={4} py="xs">
          <Stepper value={customCredits} onChange={pickCustom} min={1} max={500} />
        </Stack>
      </Collapse>
    </Stack>
  )
}
