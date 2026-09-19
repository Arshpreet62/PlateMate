import { ActionIcon, Box, Container, Group, Text, UnstyledButton } from '@mantine/core'
import { useNetwork } from '@mantine/hooks'
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
  const { online } = useNetwork()
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <Box mih="100dvh" pb={NAV_HEIGHT + 32} data-offline={!online || undefined}>
      {!online && <div className="offline-strip">No internet connection — changes won't save</div>}
      <Box component="header" px="md" py="sm" className="app-header" style={{ top: online ? 0 : 36 }}>
        <Group justify="space-between" wrap="nowrap" h={40}>
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            {back && (
              <ActionIcon variant="light" color="gray" size="lg" aria-label="Back" onClick={goBack}>
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
                c={active ? 'brand.7' : 'gray.6'}
                style={{ height: 'calc(100% - 12px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: 20, background: active ? 'var(--mantine-color-brand-0)' : 'transparent', margin: 6 }}
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
