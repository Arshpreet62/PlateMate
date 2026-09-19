import { Button, Card, Group, Stack, Text } from '@mantine/core'
import { IconLogout } from '@tabler/icons-react'
import { useAuth } from '../auth.jsx'
import { CustomerAvatar } from '../components/CustomerBits.jsx'
import { Layout } from '../components/Layout.jsx'

export function MenuPage() {
  const { user, logout } = useAuth()

  return (
    <Layout title="Menu">
      <Stack>
        <Card withBorder>
          <Group>
            <CustomerAvatar name={user.name} />
            <div>
              <Text fw={700}>{user.name}</Text>
              <Text size="sm" c="dimmed">{user.role === 'OWNER' ? 'Owner' : 'Staff'} · @{user.username}</Text>
            </div>
          </Group>
        </Card>

        <Card withBorder>
          <Text fw={700} mb={4}>Coming soon</Text>
          <Text size="sm" c="dimmed">Staff accounts, pack prices, change password, export.</Text>
        </Card>

        <Button variant="light" color="gray" leftSection={<IconLogout size={20} />} onClick={logout}>
          Log out
        </Button>
        <Text size="xs" c="dimmed" ta="center">Buffet Pass v0.3</Text>
      </Stack>
    </Layout>
  )
}
