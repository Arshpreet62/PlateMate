import { Box, Button, Center, Container, PasswordInput, Stack, Text, TextInput, ThemeIcon, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconToolsKitchen2 } from '@tabler/icons-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const form = useForm({ initialValues: { username: '', password: '' } })

  if (user) return <Navigate to="/" replace />

  const submit = form.onSubmit(async ({ username, password }) => {
    setLoading(true)
    try {
      await login(username, password)
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setLoading(false)
    }
  })

  return (
    <Box mih="100dvh" bg="#faf6f1">
      <Container size="xs" pt="12vh" px="lg">
        <form onSubmit={submit}>
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
            <TextInput label="Username" autoCapitalize="none" autoComplete="username" {...form.getInputProps('username')} />
            <PasswordInput label="Password" autoComplete="current-password" {...form.getInputProps('password')} />
            <Button type="submit" size="xl" loading={loading}>Log in</Button>
          </Stack>
        </form>
      </Container>
    </Box>
  )
}
