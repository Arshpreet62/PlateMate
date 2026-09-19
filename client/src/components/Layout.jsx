import { ActionIcon, Box, Container, Group, Text, UnstyledButton } from '@mantine/core'
import { IconArrowLeft, IconHome, IconMenu2, IconQrcode, IconUserPlus } from '@tabler/icons-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

const NAV = [
  { to: '/', label: 'Counter', icon: IconHome },
  { to: '/scan', label: 'Scan', icon: IconQrcode },
  { to: '/customers/new', label: 'Add', icon: IconUserPlus },
  { to: '/menu', label: 'Menu', icon: IconMenu2 },
]

const NAV_HEIGHT = 64

export function Layout({ title, children, back = false, action }) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <Box mih="100dvh" pb={NAV_HEIGHT + 16}>
      <Box
        component="header"
        px="md"
        py="sm"
        bg="#faf6f1"
        style={{ position: 'sticky', top: 0, zIndex: 10 }}
      >
        <Group justify="space-between" wrap="nowrap" h={40}>
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            {back && (
              <ActionIcon variant="light" color="gray" size="lg" aria-label="Back" onClick={() => navigate(-1)}>
                <IconArrowLeft size={22} />
              </ActionIcon>
            )}
            <Text fw={800} size="xl" truncate>
              {title ?? 'Buffet Pass'}
            </Text>
          </Group>
          {action}
        </Group>
      </Box>

      <Container size="xs" px="md">
        {children}
      </Container>

      <Box
        component="nav"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, height: NAV_HEIGHT, zIndex: 20,
          background: '#fff', borderTop: '1px solid #ece6df',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <Group grow gap={0} h="100%">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
            return (
              <UnstyledButton
                key={to}
                component={Link}
                to={to}
                aria-label={label}
                style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}
                c={active ? 'brand.7' : 'gray.6'}
              >
                <Icon size={26} stroke={active ? 2.4 : 1.8} />
                <Text size="xs" fw={active ? 700 : 500}>{label}</Text>
              </UnstyledButton>
            )
          })}
        </Group>
      </Box>
    </Box>
  )
}
