import { Button, Stack, Text, Textarea, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api.js'
import { Layout } from '../components/Layout.jsx'

export function NewCustomer() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(false)
  const form = useForm({
    initialValues: { name: params.get('name') ?? '', phone: '', notes: '' },
    validate: { name: (v) => (v.trim() ? null : 'Name is required') },
  })

  const submit = form.onSubmit(async (values) => {
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
  })

  return (
    <Layout title="New customer" back>
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Name" autoFocus={!params.get('name')} {...form.getInputProps('name')} />
          <TextInput label="Phone" description="Optional — helps tell apart two people with the same name" type="tel" inputMode="tel" {...form.getInputProps('phone')} />
          <Textarea label="Notes" description="Optional" autosize minRows={2} {...form.getInputProps('notes')} />
          <Button type="submit" size="xl" loading={loading}>Save and add a pack</Button>
          <Text size="sm" c="dimmed" ta="center">You can skip the pack on the next screen.</Text>
        </Stack>
      </form>
    </Layout>
  )
}
