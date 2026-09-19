import { Alert, Button, Card, Group, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { IconAlertTriangle } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { BalancePill, CustomerAvatar, customerHint } from '../components/CustomerBits.jsx'
import { Layout } from '../components/Layout.jsx'

export function NewCustomer() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [taken, setTaken] = useState(null) // { name, customers } when the typed name already exists
  const form = useForm({
    initialValues: { name: params.get('name') ?? '', phone: '', notes: '' },
    validate: { name: (v) => (v.trim() ? null : 'Name is required') },
  })

  const nameIsTaken = taken && form.values.name.trim().toLowerCase() === taken.name.toLowerCase()

  const submit = form.onSubmit(async (values) => {
    setLoading(true)
    try {
      const name = values.name.trim()
      const same = await api(`/customers?q=${encodeURIComponent(name)}&exact=1`).catch(() => [])
      if (same.length) {
        setTaken({ name, customers: same })
        return
      }
      const customer = await api('/customers', { method: 'POST', body: values })
      notifications.show({ color: 'green', message: `${customer.name} added — now add their first pack` })
      navigate(`/customers/${customer.id}?topup=1`, { replace: true })
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setLoading(false)
    }
  })

  return (
    <Layout title="New customer" back>
      <form onSubmit={submit}>
        <Stack>
          <TextInput
            label="Full name"
            description="Name + surname or a nickname, so no two customers look the same"
            placeholder="e.g. Guru Sharma"
            autoFocus={!params.get('name')}
            error={form.errors.name || (nameIsTaken ? 'This exact name is already used' : null)}
            {...form.getInputProps('name')}
          />
          {taken && (
            <Alert color="yellow" icon={<IconAlertTriangle size={20} />} title={`"${taken.name}" already exists`}>
              <Stack gap="xs" mt="xs">
                <Text size="sm">Same person? Open them instead of adding again:</Text>
                {taken.customers.map((c) => (
                  <Card key={c.id} withBorder padding="sm" component={Link} to={`/customers/${c.id}`}>
                    <Group wrap="nowrap" gap="sm">
                      <CustomerAvatar name={c.name} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} size="sm">{c.name}</Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>{customerHint(c)}</Text>
                      </div>
                      <BalancePill credits={c.credits} size="md" />
                    </Group>
                  </Card>
                ))}
                <Text size="sm">Different person? Change the name above so they can be told apart — add a surname or a nickname, like "{taken.name} (bank)".</Text>
              </Stack>
            </Alert>
          )}
          <TextInput label="Phone" description="Optional" type="tel" inputMode="tel" {...form.getInputProps('phone')} />
          <Textarea label="Notes" description="Optional — e.g. 'works at the bank next door'" autosize minRows={2} {...form.getInputProps('notes')} />
          <Button type="submit" size="xl" loading={loading} disabled={nameIsTaken}>
            Save and add a pack
          </Button>
          <Text size="sm" c="dimmed" ta="center">You can skip the pack on the next screen.</Text>
        </Stack>
      </form>
    </Layout>
  )
}
