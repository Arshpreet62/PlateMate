import { Badge, Card, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import { IconChevronRight, IconDeviceMobile, IconDownload, IconTag } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout.jsx'
import { countCustomers } from '../db/customers.js'
import { getSetting } from '../db/packs.js'
import { requestPersistence } from '../db/schema.js'

const VERSION = '1.4'

function Row({ to, icon: Icon, title, subtitle, badge }) {
  return (
    <UnstyledButton component={Link} to={to} className="menu-row">
      <Group wrap="nowrap" gap="md">
        <ThemeIcon size={42} radius="md" variant="light">
          <Icon size={22} />
        </ThemeIcon>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text fw={700}>{title}</Text>
            {badge}
          </Group>
          <Text size="sm" c="dimmed">{subtitle}</Text>
        </div>
        <IconChevronRight size={20} opacity={0.4} />
      </Group>
    </UnstyledButton>
  )
}

function backupSubtitle(lastBackupAt) {
  if (lastBackupAt === undefined) return ''
  if (!lastBackupAt) return 'Never done — the only copy is on this phone'
  const days = Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86400000)
  if (days <= 0) return 'Saved today'
  if (days === 1) return 'Saved yesterday'
  return `Saved ${days} days ago`
}

export function MenuPage() {
  const [count, setCount] = useState(null)
  const [lastBackupAt, setLastBackupAt] = useState(undefined)
  const [persisted, setPersisted] = useState(null)

  useEffect(() => {
    countCustomers().then(setCount).catch(() => {})
    getSetting().then((s) => setLastBackupAt(s.lastBackupAt ?? null)).catch(() => setLastBackupAt(null))
    requestPersistence().then(setPersisted)
  }, [])

  const backupOverdue = lastBackupAt !== undefined
    && count > 0
    && (!lastBackupAt || Date.now() - new Date(lastBackupAt).getTime() > 7 * 86400000)

  return (
    <Layout title="Menu">
      <Stack gap="md">
        <Card withBorder padding={0}>
          <Row to="/menu/plans" icon={IconTag} title="Plans" subtitle="What you sell, and how many meals each gives" />
        </Card>

        <Card withBorder padding={0}>
          <Row
            to="/menu/backup"
            icon={IconDownload}
            title="Backup"
            subtitle={backupSubtitle(lastBackupAt)}
            badge={backupOverdue ? <Badge color="yellow" size="sm" variant="light">Do this</Badge> : null}
          />
        </Card>

        <Card withBorder>
          <Group wrap="nowrap" gap="md" align="flex-start">
            <ThemeIcon size={42} radius="md" variant="light" color="gray">
              <IconDeviceMobile size={22} />
            </ThemeIcon>
            <div>
              <Text fw={700}>
                {count === null ? 'Saved on this phone' : `${count} ${count === 1 ? 'customer' : 'customers'} on this phone`}
              </Text>
              <Text size="sm" c="dimmed">
                Everything is stored inside this app on this device. It keeps working without internet, and nothing is
                sent anywhere.
              </Text>
              {persisted !== null && (
                <Text size="sm" c={persisted ? 'dimmed' : 'orange'} mt={6}>
                  {persisted
                    ? 'The phone has been asked to keep this data safe from being cleared automatically.'
                    : "The browser may clear this data if the phone runs low on space — keep backups."}
                </Text>
              )}
            </div>
          </Group>
        </Card>

        <Text size="xs" c="dimmed" ta="center">PlateMate v{VERSION}</Text>
      </Stack>
    </Layout>
  )
}
