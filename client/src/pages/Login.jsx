import { ActionIcon, Box, Button, Center, Container, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconEye, IconEyeOff, IconToolsKitchen2 } from '@tabler/icons-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [reveal, setReveal] = useState(false)
  const form = useForm({ initialValues: { username: '', secret: '' } })

  if (user) return <Navigate to="/" replace />

  const submit = async () => {
    setLoading(true)
    try {
      await login(form.values.username, form.values.secret)
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box mih="100dvh" style={{ background: 'radial-gradient(120% 60% at 50% -10%, #ffd8a8 0%, var(--bg) 60%)' }}>
      <Container size="xs" pt="12vh" px="lg">
        {/* Deliberately not a <form> with a password field: Chrome's "Save password?"
            sheet on Android can sit over the page and block every tap on a shared device. */}
        <Stack gap="lg">
          <Center>
            <Stack align="center" gap="xs">
              <ThemeIcon size={72} radius="xl" variant="light">
                <IconToolsKitchen2 size={40} />
              </ThemeIcon>
              <Title order={1}>Buffet Pass</Title>
              <Text c="dimmed">Sign in to open the counter</Text>
            </Stack>
          </Center>
          <TextInput
            label="Username"
            name="counter-user"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            enterKeyHint="next"
            {...form.getInputProps('username')}
          />
          <TextInput
            label="Password"
            name="counter-code"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
            className={reveal ? undefined : 'masked-input'}
            rightSection={
              <ActionIcon variant="subtle" color="gray" onClick={() => setReveal((v) => !v)} aria-label={reveal ? 'Hide' : 'Show'}>
                {reveal ? <IconEyeOff size={20} /> : <IconEye size={20} />}
              </ActionIcon>
            }
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            {...form.getInputProps('secret')}
          />
          <Button size="xl" loading={loading} onClick={submit}>Log in</Button>
        </Stack>
      </Container>
    </Box>
  )
}
