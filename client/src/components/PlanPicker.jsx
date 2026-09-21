import { Anchor, Collapse, Group, Stack, Text, UnstyledButton } from '@mantine/core'
import { IconCheck } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { listPacks } from '../db/packs.js'
import { Stepper } from './Stepper.jsx'

function PlanCard({ selected, onClick, title, subtitle }) {
  return (
    <UnstyledButton onClick={onClick} px="md" py="md" className="plan-card" data-selected={selected || undefined}>
      <Group justify="space-between" wrap="nowrap">
        <div style={{ minWidth: 0 }}>
          <Text fw={800} size="lg">{title}</Text>
          <Text size="sm" c="dimmed">{subtitle}</Text>
        </div>
        <div className="plan-check">{selected && <IconCheck size={16} stroke={3} />}</div>
      </Group>
    </UnstyledButton>
  )
}

function entries(n) {
  return `${n} ${n === 1 ? 'entry' : 'entries'}`
}

// Picks a plan or a custom number of entries. Reports { packId } | { credits }
// | null via onChange. No money anywhere: the app counts meals, and payment is
// settled at the counter.
export function PlanPicker({ value, onChange, currentCredits = 0 }) {
  const [packs, setPacks] = useState(null)
  const [showCustom, setShowCustom] = useState(Boolean(value?.credits))
  const [customCredits, setCustomCredits] = useState(value?.credits ?? 1)

  useEffect(() => {
    listPacks().then(setPacks).catch(() => setPacks([]))
  }, [])

  // A plan selection also carries `credits`, so this must key off the absence
  // of a packId — otherwise picking Week plan counted as "custom" and sprang
  // the stepper open showing a number nobody chose.
  const isCustom = value != null && value.packId == null && value.credits != null

  const pickCustom = (n) => {
    setCustomCredits(n)
    onChange({ credits: n })
  }

  if (packs === null) return <Text c="dimmed" ta="center">Loading plans…</Text>

  if (packs.length === 0) {
    return <Text c="dimmed" ta="center" py="md">No plans yet — add one in Menu → Plans.</Text>
  }

  const chosen = value?.credits ?? packs.find((p) => p.id === value?.packId)?.credits ?? null

  return (
    <Stack gap="sm">
      {packs.map((p) => (
        <PlanCard
          key={p.id}
          selected={value?.packId === p.id}
          onClick={() => onChange({ packId: p.id, name: p.name, credits: p.credits })}
          title={p.name}
          subtitle={entries(p.credits)}
        />
      ))}

      {!showCustom ? (
        <Anchor
          component="button"
          type="button"
          size="sm"
          c="dimmed"
          ta="center"
          onClick={() => { setShowCustom(true); pickCustom(customCredits) }}
        >
          Custom number of entries
        </Anchor>
      ) : (
        <PlanCard
          selected={isCustom}
          onClick={() => pickCustom(customCredits)}
          title="Custom"
          subtitle={isCustom ? entries(customCredits) : 'Choose how many'}
        />
      )}
      <Collapse expanded={isCustom}>
        <Stack gap={4} py="xs">
          <Stepper value={customCredits} onChange={pickCustom} min={1} max={500} />
        </Stack>
      </Collapse>

      {/* What they walk away with, which is the number that matters to them. */}
      {chosen != null && (
        <Text ta="center" fw={700} size="lg" mt={4}>
          {currentCredits > 0
            ? `${currentCredits} left + ${chosen} = ${currentCredits + chosen} entries on their pass`
            : `${entries(chosen)} on their pass`}
        </Text>
      )}
    </Stack>
  )
}
