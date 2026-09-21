import { ActionIcon, Box, Button, Card, Drawer, Group, Loader, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { IconPlus, IconQrcode, IconSearch, IconUserPlus, IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BalancePill, CustomerAvatar, customerHint } from '../components/CustomerBits.jsx'
import { Layout } from '../components/Layout.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { filterCustomers, listCustomers } from '../db/customers.js'
import { deductEntries } from '../entries.jsx'
import { useAction } from '../useAction.js'

const FILTERS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'low', label: 'Low', match: (c) => c.credits > 0 && c.credits <= 2 },
  { key: 'finished', label: 'Finished', match: (c) => c.credits <= 0 },
]

function CustomerRow({ customer, busy, onUse, onMore }) {
  const navigate = useNavigate()
  return (
    <Card withBorder padding="sm" className="tap-row">
      <Group wrap="nowrap" gap="sm">
        <UnstyledButton onClick={() => navigate(`/customers/${customer.id}`)} style={{ flex: 1, minWidth: 0 }}>
          <Group wrap="nowrap" gap="sm">
            <CustomerAvatar name={customer.name} />
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text fw={700} size="lg" truncate>{customer.name}</Text>
              <Group gap={6} wrap="nowrap" mt={2}>
                <BalancePill credits={customer.credits} size="sm" />
                <Text size="sm" c="dimmed" truncate>{customerHint(customer)}</Text>
              </Group>
            </Box>
          </Group>
        </UnstyledButton>
        {customer.credits > 0 ? (
          <Stack gap={2} align="stretch">
            <Button size="md" loading={busy} onClick={onUse}>Use 1</Button>
            {customer.credits > 1 && (
              <Button size="compact-sm" variant="transparent" color="gray" fw={500} onClick={onMore}>
                more people
              </Button>
            )}
          </Stack>
        ) : (
          <Button size="md" variant="light" component={Link} to={`/customers/${customer.id}?topup=1`}>
            Renew
          </Button>
        )}
      </Group>
    </Card>
  )
}

export function CustomerList() {
  const [customers, setCustomers] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [group, setGroup] = useState(null) // customer chosen for a multi-person deduction
  const [count, setCount] = useState(1)
  const [busyId, setBusyId] = useState(null) // which row shows a spinner
  const { run } = useAction()

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

  // Patch the one row rather than reloading the whole list, so the number
  // changes under the finger with no flicker. lastVisitAt is left to the next
  // full load: guessing it here would be wrong after an undo.
  const patch = (updated) =>
    setCustomers((list) => list?.map((c) => (c.id === updated.id ? { ...c, credits: updated.credits } : c)) ?? list)

  const spend = (customer, n) =>
    run(async () => {
      setBusyId(customer.id)
      try {
        await deductEntries(customer, n, { onChange: (r) => patch(r.customer) })
      } finally {
        setBusyId(null)
      }
    })

  const groupUse = async () => {
    const c = group
    setGroup(null)
    await spend(c, count)
  }

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.key, customers?.filter(f.match).length ?? 0])),
    [customers],
  )

  const cleanQuery = query.trim()

  return (
    <Layout>
      <Stack gap="md">
        <TextInput
          placeholder="Search name or phone"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          size="xl"
          radius="xl"
          className="search-pill"
          leftSection={<IconSearch size={22} />}
          rightSection={
            cleanQuery ? (
              <ActionIcon variant="subtle" color="gray" onClick={() => setQuery('')} aria-label="Clear">
                <IconX size={20} />
              </ActionIcon>
            ) : (
              <ActionIcon variant="subtle" color="gray" component={Link} to="/scan" aria-label="Scan a pass">
                <IconQrcode size={22} />
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
            {shown.map((c) => (
              <CustomerRow
                key={c.id}
                customer={c}
                busy={busyId === c.id}
                onUse={() => spend(c, 1)}
                onMore={() => { setCount(2); setGroup(c) }}
              />
            ))}
          </Stack>
        )}
      </Stack>

      <Button
        className="fab"
        component={Link}
        to="/customers/new"
        leftSection={<IconPlus size={22} />}
        size="lg"
      >
        Add
      </Button>

      <Drawer opened={!!group} onClose={() => setGroup(null)} title={group ? `${group.name} — how many people?` : ''}>
        {group && (
          <Stack pb="md">
            <Stepper value={count} onChange={setCount} min={1} max={group.credits} />
            <Text c="dimmed" ta="center" size="sm">{group.credits} left now → {group.credits - count} after</Text>
            <Button size="xl" onClick={groupUse}>Use {count} entries</Button>
          </Stack>
        )}
      </Drawer>
    </Layout>
  )
}
