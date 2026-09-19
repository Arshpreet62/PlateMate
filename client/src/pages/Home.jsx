import { Badge, Button, Card, Group, Loader, Stack, Text, TextInput } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { Layout } from '../components/Layout.jsx'
import { useMoney } from '../settings.jsx'

export function Home() {
  const [query, setQuery] = useState('')
  const [debounced] = useDebouncedValue(query.trim(), 250)
  const [customers, setCustomers] = useState(null)
  const [today, setToday] = useState(null)
  const money = useMoney()

  useEffect(() => {
    let cancelled = false
    api(`/customers?q=${encodeURIComponent(debounced)}`)
      .then((list) => !cancelled && setCustomers(list))
      .catch(() => !cancelled && setCustomers([]))
    return () => { cancelled = true }
  }, [debounced])

  useEffect(() => {
    api('/stats/today').then(setToday).catch(() => {})
  }, [])

  return (
    <Layout>
      <Stack>
        <TextInput
          placeholder="Search name or phone"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          autoFocus
          size="xl"
        />
        <Group grow>
          <Button component={Link} to="/customers/new" variant="light">+ Add customer</Button>
          <Button component={Link} to="/scan" variant="light">Scan QR</Button>
        </Group>
        {today && (
          <Text c="dimmed" ta="center" size="sm">
            Today: {today.entries} {today.entries === 1 ? 'entry' : 'entries'} · {money(today.money)} taken
          </Text>
        )}
        {customers === null ? (
          <Loader mx="auto" />
        ) : customers.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            {debounced ? 'No customer found. Check the spelling or add them.' : 'No customers yet.'}
          </Text>
        ) : (
          <Stack gap="xs">
            {!debounced && <Text size="xs" c="dimmed">Recently added</Text>}
            {customers.map((c) => (
              <Card key={c.id} component={Link} to={`/customers/${c.id}`} withBorder padding="md" radius="md">
                <Group justify="space-between" wrap="nowrap">
                  <div>
                    <Text fw={600} size="lg">{c.name}</Text>
                    <Text c="dimmed" size="sm">{c.phone || 'No phone yet'}</Text>
                  </div>
                  <Badge size="xl" color={c.credits > 0 ? 'green' : 'gray'} variant="light">
                    {c.credits} left
                  </Badge>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Layout>
  )
}
