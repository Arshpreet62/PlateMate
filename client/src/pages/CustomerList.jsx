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
        {/* Scanning the pass is the fast path at a busy counter, so it gets the
            top of the screen rather than an icon tucked inside the search box. */}
        <Button
          component={Link}
          to="/scan"
          size="xl"
          fullWidth
          className="scan-cta"
          leftSection={<IconQrcode size={30} stroke={1.9} />}
        >
          Scan pass
        </Button>

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
            ) : filter !== 'all' ? (
              <Text c="dimmed">Nobody here — everyone has entries left.</Text>
            ) : (
              <>
                <Text fw={600} mb={4}>No customers yet</Text>
                <Text c="dimmed" size="sm" mb="md">Add the first person and pick their plan.</Text>
                <Button leftSection={<IconUserPlus size={20} />} component={Link} to="/customers/new">
                  Add a customer
                </Button>
              </>
            )}
          </Card>
        ) : (
          <Stack gap="xs">
            {shown.map((c) => <CustomerRow key={c.id} customer={c} />)}
          </Stack>
        )}
      </Stack>

      <Button className="fab" component={Link} to="/customers/new" leftSection={<IconPlus size={22} />} size="lg">
        Add
      </Button>
    </Layout>
  )
}
