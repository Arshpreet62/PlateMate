import { Card, Group, Stack, Text, ThemeIcon, UnstyledButton } from '@mantine/core'
import { IconChevronRight, IconDeviceMobile, IconTag } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Layout } from '../components/Layout.jsx'
import { countCustomers } from '../db/customers.js'

const VERSION = '0.5'

function Row({ to, icon: Icon, title, subtitle }) {
  return (
    <UnstyledButton component={Link} to={to} className="menu-row">
      <Group wrap="nowrap" gap="md">
        <ThemeIcon size={42} radius="md" variant="light">
          <Icon size={22} />
        </ThemeIcon>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700}>{title}</Text>
          <Text size="sm" c="dimmed">{subtitle}</Text>
        </div>
        <IconChevronRight size={20} opacity={0.4} />
      </Group>
    </UnstyledButton>
  )
}

export function MenuPage() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    countCustomers().then(setCount).catch(() => {})
  }, [])

  return (
    <Layout title="Menu">
      <Stack gap="md">
        <Card withBorder padding={0}>
          <Row to="/menu/plans" icon={IconTag} title="Plans & prices" subtitle="What you sell and what it costs" />
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
                sent anywhere. If you clear the browser's data or lose the phone, the records go with it.
              </Text>
            </div>
          </Group>
        </Card>

        <Text size="xs" c="dimmed" ta="center">Buffet Pass v{VERSION}</Text>
      </Stack>
    </Layout>
  )
}
