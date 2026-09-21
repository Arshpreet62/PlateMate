import { ActionIcon, Box, Container, Group, Text, UnstyledButton } from '@mantine/core'
import { IconArrowLeft, IconMenu2, IconUsers } from '@tabler/icons-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// Two destinations only. Adding a customer is a button on the list, and
// scanning is an icon in the search box, because both belong next to the list
// they act on rather than in a tab of their own.
const NAV = [
  { to: '/', label: 'Customers', icon: IconUsers },
  { to: '/menu', label: 'Menu', icon: IconMenu2 },
]

const NAV_HEIGHT = 64

export function Layout({ title, children, back = false, action }) {
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <Box mih="100dvh" pb={NAV_HEIGHT + 32}>
      <Box component="header" px="md" py="sm" className="app-header">
        <Group justify="space-between" wrap="nowrap" h={40}>
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            {back && (
              <ActionIcon variant="subtle" color="gray" size="lg" aria-label="Back" onClick={goBack}>
                <IconArrowLeft size={22} />
              </ActionIcon>
            )}
            <Text fw={800} size="xl" truncate>
              {title ?? 'PlateMate'}
            </Text>
          </Group>
          {action}
        </Group>
      </Box>

      <Container size="xs" px="md">
        {children}
      </Container>

      <Box component="nav" className="bottom-nav">
        <Group grow gap={0} h="100%">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <UnstyledButton
                key={to}
                component={Link}
                to={to}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="nav-item"
                data-active={active || undefined}
              >
                <Icon size={24} stroke={active ? 2.3 : 1.8} />
                <Text size="xs" fw={active ? 700 : 500}>{label}</Text>
              </UnstyledButton>
            )
          })}
        </Group>
      </Box>
    </Box>
  )
}
