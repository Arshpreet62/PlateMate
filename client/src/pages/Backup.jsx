import { Alert, Button, Card, FileButton, Group, Stack, Text, ThemeIcon } from '@mantine/core'
import { modals } from '@mantine/modals'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle, IconDownload, IconUpload } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import { Layout } from '../components/Layout.jsx'
import { backupFileName, exportBackup, importBackup, markBackedUp } from '../db/backup.js'
import { countCustomers } from '../db/customers.js'
import { getSetting } from '../db/packs.js'
import { useAction } from '../useAction.js'

function whenLabel(iso) {
  if (!iso) return 'Never backed up'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'Backed up today'
  if (days === 1) return 'Backed up yesterday'
  return `Backed up ${days} days ago`
}

function isStale(iso) {
  return !iso || Date.now() - new Date(iso).getTime() > 7 * 86400000
}

export function Backup() {
  const [lastBackupAt, setLastBackupAt] = useState(undefined)
  const [count, setCount] = useState(null)
  const { busy, run } = useAction()

  const load = useCallback(() => {
    getSetting().then((s) => setLastBackupAt(s.lastBackupAt ?? null)).catch(() => setLastBackupAt(null))
    countCustomers().then(setCount).catch(() => {})
  }, [])

  useEffect(load, [load])

  const download = () =>
    run(async () => {
      try {
        const blob = new Blob([JSON.stringify(await exportBackup())], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = backupFileName()
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 5000)
        await markBackedUp()
        load()
        notifications.show({ color: 'green', message: 'Backup saved — keep a copy somewhere else too' })
      } catch (err) {
        notifications.show({ color: 'red', message: err.message })
      }
    })

  const restore = (file) => {
    if (!file) return
    modals.openConfirmModal({
      title: 'Replace everything with this backup?',
      children: (
        <Text size="sm">
          Every customer, balance and plan on this phone is replaced by what is in <b>{file.name}</b>. Anything added
          since that backup was made is lost. This cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Replace everything', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () =>
        run(async () => {
          try {
            const result = await importBackup(await file.text())
            load()
            notifications.show({
              color: 'green',
              message: `Restored ${result.customers} ${result.customers === 1 ? 'customer' : 'customers'}`,
            })
          } catch (err) {
            notifications.show({ color: 'red', message: err.message, autoClose: 8000 })
          }
        }),
    })
  }

  return (
    <Layout title="Backup" back>
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          This phone holds the only copy of your customers. A backup is a single file you can keep somewhere else —
          send it to yourself on WhatsApp, or save it to Drive.
        </Text>

        {lastBackupAt !== undefined && isStale(lastBackupAt) && count > 0 && (
          <Alert color="yellow" icon={<IconAlertTriangle size={20} />}>
            {whenLabel(lastBackupAt)}. If this phone is lost or wiped right now, {count}{' '}
            {count === 1 ? 'customer' : 'customers'} and every paid balance go with it.
          </Alert>
        )}

        <Card withBorder>
          <Stack gap="sm">
            <Group wrap="nowrap" gap="md">
              <ThemeIcon size={42} radius="md" variant="light">
                <IconDownload size={22} />
              </ThemeIcon>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text fw={700}>Save a backup</Text>
                <Text size="sm" c="dimmed">{lastBackupAt === undefined ? '' : whenLabel(lastBackupAt)}</Text>
              </div>
            </Group>
            <Button loading={busy} onClick={download}>Download backup</Button>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="sm">
            <Group wrap="nowrap" gap="md">
              <ThemeIcon size={42} radius="md" variant="light" color="gray">
                <IconUpload size={22} />
              </ThemeIcon>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text fw={700}>Restore a backup</Text>
                <Text size="sm" c="dimmed">For a new phone, or after the data was cleared</Text>
              </div>
            </Group>
            <FileButton onChange={restore} accept="application/json,.json">
              {(props) => <Button {...props} variant="light" color="gray" loading={busy}>Choose a backup file</Button>}
            </FileButton>
            <Text size="xs" c="dimmed">
              Restoring replaces everything on this phone with the contents of the file.
            </Text>
          </Stack>
        </Card>
      </Stack>
    </Layout>
  )
}
