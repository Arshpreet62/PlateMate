import { Button, Container, Paper, PasswordInput, Stack, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
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
    <Container size="xs" pt="15vh">
      <Paper withBorder p="xl" radius="lg">
        <form onSubmit={submit}>
          <Stack>
            <Title order={2} ta="center">Buffet Pass</Title>
            <TextInput label="Username" autoCapitalize="none" autoComplete="username" {...form.getInputProps('username')} />
            <PasswordInput label="Password" autoComplete="current-password" {...form.getInputProps('password')} />
            <Button type="submit" loading={loading} fullWidth>Log in</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  )
}
