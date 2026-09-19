import { Button, Stack, Textarea, TextInput } from '@mantine/core'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { Layout } from '../components/Layout.jsx'

export function NewCustomer() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const form = useForm({
    initialValues: { name: '', phone: '', notes: '' },
    validate: {
      name: (v) => (v.trim() ? null : 'Name is required'),
      phone: (v) => (v.replace(/\s+/g, '').length >= 6 ? null : 'Phone number is required'),
    },
  })

  const submit = form.onSubmit(async (values) => {
    setLoading(true)
    try {
      const customer = await api('/customers', { method: 'POST', body: values })
      notifications.show({ color: 'green', message: `${customer.name} added` })
      navigate(`/customers/${customer.id}`, { replace: true })
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setLoading(false)
    }
  })

  return (
    <Layout title="Add customer">
      <form onSubmit={submit}>
        <Stack>
          <TextInput label="Name" autoFocus {...form.getInputProps('name')} />
          <TextInput label="Phone" type="tel" inputMode="tel" {...form.getInputProps('phone')} />
          <Textarea label="Notes (optional)" autosize minRows={2} {...form.getInputProps('notes')} />
          <Button type="submit" loading={loading} fullWidth>Save customer</Button>
        </Stack>
      </form>
    </Layout>
  )
}
