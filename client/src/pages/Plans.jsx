import { ActionIcon, Button, Card, Group, Modal, NumberInput, Stack, Switch, Text, TextInput } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import { Layout } from '../components/Layout.jsx'
import { createPack, deletePack, listPacks, updatePack } from '../db/packs.js'
import { useAction } from '../useAction.js'

const BLANK = { name: '', credits: 1 }

export function Plans() {
  const [packs, setPacks] = useState(null)
  const [editing, setEditing] = useState(null) // pack being edited, or BLANK for a new one
  const { busy, run } = useAction()

  const load = useCallback(() => {
    listPacks({ all: true }).then(setPacks).catch(() => setPacks([]))
  }, [])

  useEffect(load, [load])

  const act = (fn, message) =>
    run(async () => {
      try {
        await fn()
        notifications.show({ color: 'green', message })
        load()
        return true
      } catch (err) {
        notifications.show({ color: 'red', message: err.message })
        return false
      }
    })

  const savePack = async () => {
    const { id, ...data } = editing
    const ok = await act(() => (id ? updatePack(id, data) : createPack(data)), id ? 'Plan saved' : 'Plan added')
    if (ok) setEditing(null)
  }

  const removePack = (pack) =>
    modals.openConfirmModal({
      title: `Delete "${pack.name}"?`,
      children: <Text size="sm">Past sales keep their record. You can also just turn it off to stop offering it.</Text>,
      labels: { confirm: 'Delete', cancel: 'Keep' },
      confirmProps: { color: 'red' },
      onConfirm: () => act(() => deletePack(pack.id), 'Plan deleted'),
    })

  return (
    <Layout title="Plans" back>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          A plan is a name and a number of entries. What it costs is settled at the counter — the app only keeps
          count of meals.
        </Text>

        {packs === null ? (
          <Text c="dimmed" ta="center">Loading…</Text>
        ) : (
          <Stack gap="xs">
            {packs.map((p) => (
              <Card key={p.id} withBorder padding="sm" data-inactive={!p.active || undefined} className="plan-row">
                <Group wrap="nowrap" gap="sm">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={700} truncate>{p.name}</Text>
                    <Text size="sm" c="dimmed">{p.credits} {p.credits === 1 ? 'entry' : 'entries'}</Text>
                  </div>
                  <Switch
                    checked={p.active}
                    onChange={(e) => act(() => updatePack(p.id, { active: e.currentTarget.checked }), 'Plan updated')}
                    aria-label={p.active ? 'On sale' : 'Not on sale'}
                  />
                  <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Edit" onClick={() => setEditing(p)}>
                    <IconPencil size={20} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" size="lg" aria-label="Delete" onClick={() => removePack(p)}>
                    <IconTrash size={20} />
                  </ActionIcon>
                </Group>
              </Card>
            ))}
          </Stack>
        )}

        <Button variant="light" leftSection={<IconPlus size={20} />} onClick={() => setEditing({ ...BLANK })}>
          Add a plan
        </Button>
      </Stack>

      <Modal opened={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit plan' : 'New plan'}>
        {editing && (
          <Stack>
            <TextInput
              label="Name"
              placeholder="e.g. Week plan"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.currentTarget.value })}
            />
            <NumberInput
              label="Entries"
              description="How many meals this plan gives"
              allowDecimal={false}
              min={1}
              value={editing.credits}
              onChange={(v) => setEditing({ ...editing, credits: Number(v) || 0 })}
            />
            <Button loading={busy} onClick={savePack} disabled={!editing.name.trim() || editing.credits < 1}>
              Save
            </Button>
          </Stack>
        )}
      </Modal>
    </Layout>
  )
}
