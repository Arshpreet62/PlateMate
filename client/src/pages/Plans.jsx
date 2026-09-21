import { ActionIcon, Button, Card, Group, Modal, NumberInput, Stack, Switch, Text, TextInput } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import { Layout } from '../components/Layout.jsx'
import { createPack, deletePack, listPacks, updatePack, updateSettings } from '../db/packs.js'
import { useMoney, useSettings } from '../settings.jsx'

const BLANK = { name: '', credits: 1, price: 0 }

export function Plans() {
  const money = useMoney()
  const { settings, reload: reloadSettings } = useSettings()
  const [packs, setPacks] = useState(null)
  const [editing, setEditing] = useState(null) // pack being edited, or BLANK for a new one
  const [prices, setPrices] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    listPacks({ all: true }).then(setPacks).catch(() => setPacks([]))
  }, [])

  useEffect(load, [load])

  const run = async (fn, message) => {
    setBusy(true)
    try {
      await fn()
      notifications.show({ color: 'green', message })
      load()
      return true
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
      return false
    } finally {
      setBusy(false)
    }
  }

  const savePack = async () => {
    const { id, ...data } = editing
    const ok = await run(
      () => (id ? updatePack(id, data) : createPack(data)),
      id ? 'Plan saved' : 'Plan added',
    )
    if (ok) setEditing(null)
  }

  const removePack = (pack) =>
    modals.openConfirmModal({
      title: `Delete "${pack.name}"?`,
      children: <Text size="sm">Past sales keep their record. You can also just turn it off to stop selling it.</Text>,
      labels: { confirm: 'Delete', cancel: 'Keep' },
      confirmProps: { color: 'red' },
      onConfirm: () => run(() => deletePack(pack.id), 'Plan deleted'),
    })

  const savePrices = async () => {
    const ok = await run(() => updateSettings(prices), 'Prices saved')
    if (ok) {
      reloadSettings()
      setPrices(null)
    }
  }

  return (
    <Layout title="Plans & prices" back>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          These are the plans you can sell. Turn one off to stop offering it without losing its history.
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
                    <Text size="sm" c="dimmed">{p.credits} entries · {money(p.price)}</Text>
                  </div>
                  <Switch
                    checked={p.active}
                    onChange={(e) => run(() => updatePack(p.id, { active: e.currentTarget.checked }), 'Plan updated')}
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

        <Card withBorder>
          <Stack gap="sm">
            <div>
              <Text fw={700}>Other number of entries</Text>
              <Text size="sm" c="dimmed">When someone buys a custom amount instead of a plan.</Text>
            </div>
            <Group grow align="flex-start">
              <NumberInput
                label={`Under ${settings.customThreshold}`}
                description="per entry"
                prefix={settings.currency}
                allowDecimal={false}
                min={0}
                value={prices?.customPriceBelow ?? settings.customPriceBelow}
                onChange={(v) => setPrices({ ...settings, ...prices, customPriceBelow: Number(v) || 0 })}
              />
              <NumberInput
                label={`${settings.customThreshold} and over`}
                description="per entry"
                prefix={settings.currency}
                allowDecimal={false}
                min={0}
                value={prices?.customPriceAtAbove ?? settings.customPriceAtAbove}
                onChange={(v) => setPrices({ ...settings, ...prices, customPriceAtAbove: Number(v) || 0 })}
              />
            </Group>
            <NumberInput
              label="Cheaper rate starts at"
              description="entries"
              allowDecimal={false}
              min={1}
              value={prices?.customThreshold ?? settings.customThreshold}
              onChange={(v) => setPrices({ ...settings, ...prices, customThreshold: Number(v) || 1 })}
            />
            <Button loading={busy} disabled={!prices} onClick={savePrices}>Save prices</Button>
          </Stack>
        </Card>
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
              allowDecimal={false}
              min={1}
              value={editing.credits}
              onChange={(v) => setEditing({ ...editing, credits: Number(v) || 0 })}
            />
            <NumberInput
              label="Price"
              prefix={settings.currency}
              allowDecimal={false}
              min={0}
              value={editing.price}
              onChange={(v) => setEditing({ ...editing, price: Number(v) || 0 })}
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
