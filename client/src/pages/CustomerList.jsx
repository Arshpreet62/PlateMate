import { ActionIcon, Box, Button, Card, Group, Loader, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { IconPlus, IconQrcode, IconSearch, IconUserPlus, IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CustomerAvatar, customerHint } from '../components/CustomerBits.jsx'
import { Layout } from '../components/Layout.jsx'
import { filterCustomers, listCustomers } from '../db/customers.js'

const FILTERS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'low', label: 'Low', match: (c) => c.credits > 0 && c.credits <= 2 },
  { key: 'finished', label: 'Finished', match: (c) => c.credits <= 0 },
]

// Rows do nothing but open the customer. Nothing here can spend an entry: a
// misplaced thumb on a list is far too easy, so a deduction always costs a tap
// into the person's own page where their name and balance are in full view.
function CustomerRow({ customer }) {
  const navigate = useNavigate()
  const finished = customer.credits <= 0
  return (
    <UnstyledButton
      className="tap-row customer-row"
      onClick={() => navigate(`/customers/${customer.id}`)}
      aria-label={`${customer.name}, ${customer.credits} entries left`}
    >
      <Group wrap="nowrap" gap="sm">
        <CustomerAvatar name={customer.name} />
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fw={700} size="lg" truncate>{customer.name}</Text>
          <Text size="sm" c="dimmed" truncate>{customerHint(customer)}</Text>
        </Box>
        <Box className="row-balance" data-finished={finished || undefined} data-low={(!finished && customer.credits <= 2) || undefined}>
          <Text className="row-balance-number">{customer.credits}</Text>
          <Text className="row-balance-label">{finished ? 'none' : 'left'}</Text>
        </Box>
      </Group>
    </UnstyledButton>
  )
}

export function CustomerList() {
  const [customers, setCustomers] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const load = useCallback(() => {
    listCustomers().then(setCustomers).catch(() => setCustomers([]))
  }, [])

  useEffect(load, [load])

  // Everything is already in memory, so typing filters instantly.
  const shown = useMemo(() => {
    if (!customers) return []
    const match = FILTERS.find((f) => f.key === filter).match
    return filterCustomers(customers.filter(match), query)
  }, [customers, filter, query])

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, customers?.filter(f.match).length ?? 0])),
    [customers],
  )

  const cleanQuery = query.trim()

  return (
    <Layout>
      <Stack gap="md">
        {/* The two things the counter starts from, side by side at the top.
            Scan is the wider, filled one: it is the fast path when someone
            walks up with their pass already open. */}
        <Group gap="xs" wrap="nowrap" className="action-row">
          <Button
            component={Link}
            to="/customers/new"
            variant="light"
            leftSection={<IconPlus size={22} />}
            style={{ flex: 4 }}
          >
            Add
          </Button>
          <Button
            component={Link}
            to="/scan"
            leftSection={<IconQrcode size={28} stroke={1.9} />}
            style={{ flex: 6 }}
          >
            Scan pass
          </Button>
        </Group>

        <TextInput
          placeholder="or search by name or phone"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          size="lg"
          radius="xl"
          className="search-pill"
          leftSection={<IconSearch size={20} />}
          rightSection={
            cleanQuery && (
              <ActionIcon variant="subtle" color="gray" onClick={() => setQuery('')} aria-label="Clear">
                <IconX size={20} />
              </ActionIcon>
            )
          }
        />

        <Group gap="xs">
          {FILTERS.map((f) => (
            <UnstyledButton
              key={f.key}
              className="chip"
              data-active={filter === f.key || undefined}
              onClick={() => setFilter(f.key)}
            >
              {f.label}{customers ? ` ${counts[f.key]}` : ''}
            </UnstyledButton>
          ))}
        </Group>

        {customers === null ? (
          <Loader mx="auto" mt="xl" />
        ) : shown.length === 0 ? (
          <Card withBorder ta="center" py="xl">
            {cleanQuery ? (
              <>
                <Text c="dimmed" mb="md">No one called "{cleanQuery}"</Text>
                <Button leftSection={<IconUserPlus size={20} />} component={Link} to={`/customers/new?name=${encodeURIComponent(cleanQuery)}`}>
                  Add as new customer
                </Button>
              </>
            ) : filter === 'low' ? (
              <Text c="dimmed">Nobody is running low.</Text>
            ) : filter === 'finished' ? (
              <Text c="dimmed">Nobody has run out.</Text>
            ) : (
              <>
                <Text fw={600} mb={4}>No customers yet</Text>
                <Text c="dimmed" size="sm">Tap <b>Add</b> above to set up the first person.</Text>
              </>
            )}
          </Card>
        ) : (
          <Stack gap="xs">
            {shown.map((c) => <CustomerRow key={c.id} customer={c} />)}
          </Stack>
        )}
      </Stack>
    </Layout>
  )
}
