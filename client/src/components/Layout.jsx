import { ActionIcon, AppShell, Container, Group, Text } from '@mantine/core'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export function Layout({ title, children, back }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const showBack = back ?? location.pathname !== '/'

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            {showBack && (
              <ActionIcon variant="subtle" size="lg" aria-label="Back" onClick={() => navigate(-1)}>
                <span style={{ fontSize: 22 }}>&larr;</span>
              </ActionIcon>
            )}
            <Text component={Link} to="/" fw={700} size="lg" c="inherit" td="none">
              {title ?? 'Buffet Pass'}
            </Text>
          </Group>
          {user && (
            <Text size="sm" c="dimmed" style={{ cursor: 'pointer' }} onClick={logout}>
              {user.name} · Log out
            </Text>
          )}
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="xs" px={0}>
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}
