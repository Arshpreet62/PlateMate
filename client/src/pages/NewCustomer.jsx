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
  const [duplicates, setDuplicates] = useState(null) // existing customers with the same name
  const form = useForm({
    initialValues: { name: params.get('name') ?? '', phone: '', notes: '' },
    validate: {
      name: (v) => (v.trim() ? null : 'Name is required'),
      phone: (v, values) =>
        duplicates?.length && !v.trim() && !values.notes.trim()
          ? 'Add a phone or a note so staff can tell them apart'
          : null,
    },
  })

  const create = async (values) => {
    setLoading(true)
    try {
      const customer = await api('/customers', { method: 'POST', body: values })
      notifications.show({ color: 'green', message: `${customer.name} added — now add their first pack` })
      navigate(`/customers/${customer.id}?topup=1`, { replace: true })
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  const submit = form.onSubmit(async (values) => {
    if (duplicates === null) {
      setLoading(true)
      const same = await api(`/customers?q=${encodeURIComponent(values.name.trim())}&exact=1`).catch(() => [])
      setLoading(false)
      if (same.length) {
        setDuplicates(same)
        return
      }
    }
    await create(values)
  })

  return (
    <Layout title="New customer" back>
      <form onSubmit={submit}>
        <Stack>
          <TextInput
            label="Name"
            autoFocus={!params.get('name')}
            {...form.getInputProps('name')}
            onChange={(e) => { form.getInputProps('name').onChange(e); setDuplicates(null) }}
          />
          {duplicates?.length > 0 && (
            <Alert color="yellow" icon={<IconAlertTriangle size={20} />} title={`There's already ${duplicates.length === 1 ? 'a customer' : `${duplicates.length} customers`} called ${form.values.name.trim()}`}>
              <Stack gap="xs" mt="xs">
                <Text size="sm">Is it the same person? Open them instead of adding a second one.</Text>
                {duplicates.map((c) => (
                  <Card key={c.id} withBorder padding="sm" component={Link} to={`/customers/${c.id}`}>
                    <Group wrap="nowrap" gap="sm">
                      <CustomerAvatar name={c.name} size={36} />
                      <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>{customerHint(c)}</Text>
                      <BalancePill credits={c.credits} size="md" />
                    </Group>
                  </Card>
                ))}
                <Text size="sm">Different person? Add a phone or note below so staff can tell them apart, then save.</Text>
              </Stack>
            </Alert>
          )}
          <TextInput label="Phone" description="Optional — helps tell apart two people with the same name" type="tel" inputMode="tel" {...form.getInputProps('phone')} />
          <Textarea label="Notes" description="Optional — e.g. 'works at the bank next door'" autosize minRows={2} {...form.getInputProps('notes')} />
          <Button type="submit" size="xl" loading={loading}>
            {duplicates?.length ? 'Add as a different person' : 'Save and add a pack'}
          </Button>
          <Text size="sm" c="dimmed" ta="center">You can skip the pack on the next screen.</Text>
        </Stack>
      </form>
    </Layout>
  )
}
