import { ActionIcon, Box, Button, Card, Drawer, Group, Loader, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { useDebouncedValue } from '@mantine/hooks'
import { IconSearch, IconUserPlus, IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { BalancePill, CustomerAvatar, customerHint } from '../components/CustomerBits.jsx'
import { Layout } from '../components/Layout.jsx'
import { Stepper } from '../components/Stepper.jsx'
import { useEntries } from '../entries.jsx'

function timeOf(iso) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
}

export function Home() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debounced] = useDebouncedValue(query.trim(), 200)
  const [results, setResults] = useState(null)
  const [today, setToday] = useState(null)
  const [group, setGroup] = useState(null) // customer chosen for a multi-person deduction
  const [count, setCount] = useState(1)
  const [busyId, setBusyId] = useState(null)

  const loadToday = useCallback(() => api('/stats/today').then(setToday).catch(() => {}), [])

  useEffect(() => {
    if (!debounced) return setResults(null)
    let cancelled = false
    api(`/customers?q=${encodeURIComponent(debounced)}`)
      .then((list) => !cancelled && setResults(list))
      .catch(() => !cancelled && setResults([]))
    return () => { cancelled = true }
  }, [debounced])

  useEffect(() => { loadToday() }, [loadToday])

  const patchCustomer = (updated) => {
    setResults((list) => list?.map((c) => (c.id === updated.id ? { ...c, credits: updated.credits } : c)) ?? list)
    loadToday()
  }

  const quickUse = async (customer) => {
    setBusyId(customer.id)
    await useEntries(customer, 1, { onChange: (r) => patchCustomer(r.customer) })
    setBusyId(null)
  }

  const groupUse = async () => {
    const c = group
    setGroup(null)
    setBusyId(c.id)
    await useEntries(c, count, { onChange: (r) => patchCustomer(r.customer) })
    setBusyId(null)
  }

  return (
    <Layout>
      <Stack gap="md">
        <TextInput
          placeholder="Customer name or phone"
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          size="xl"
          radius="xl"
          leftSection={<IconSearch size={22} />}
          rightSection={
            query && (
              <ActionIcon variant="subtle" color="gray" onClick={() => setQuery('')} aria-label="Clear">
                <IconX size={20} />
              </ActionIcon>
            )
          }
          autoFocus
        />

        {debounced ? (
          results === null ? (
            <Loader mx="auto" />
          ) : results.length === 0 ? (
            <Card withBorder ta="center" py="xl">
              <Text c="dimmed" mb="md">No one called "{debounced}"</Text>
              <Button leftSection={<IconUserPlus size={20} />} component={Link} to={`/customers/new?name=${encodeURIComponent(debounced)}`}>
                Add as new customer
              </Button>
            </Card>
          ) : (
            <Stack gap="xs">
              {new Set(results.map((c) => c.name.trim().toLowerCase())).size < results.length && (
                <Text size="sm" c="yellow.8" fw={600}>Same name, different people — check the phone, note, or last visit before tapping.</Text>
              )}
              {results.map((c) => (
                <Card key={c.id} withBorder padding="sm" className="tap-row">
                  <Group wrap="nowrap" gap="sm">
                    <UnstyledButton onClick={() => navigate(`/customers/${c.id}`)} style={{ flex: 1, minWidth: 0 }}>
                      <Group wrap="nowrap" gap="sm">
                        <CustomerAvatar name={c.name} />
                        <Box style={{ minWidth: 0 }}>
                          <Group gap="xs" wrap="nowrap">
                            <Text fw={700} size="lg" truncate>{c.name}</Text>
                            <BalancePill credits={c.credits} size="md" />
                          </Group>
                          <Text size="sm" c="dimmed" lineClamp={1}>{customerHint(c)}</Text>
                        </Box>
                      </Group>
                    </UnstyledButton>
                    {c.credits > 0 ? (
                      <Stack gap={4} align="stretch">
                        <Button size="md" loading={busyId === c.id} onClick={() => quickUse(c)}>
                          Use 1
                        </Button>
                        {c.credits > 1 && (
                          <Button size="compact-sm" variant="subtle" color="gray" onClick={() => { setCount(2); setGroup(c) }}>
                            more people
                          </Button>
                        )}
                      </Stack>
                    ) : (
                      <Button size="md" variant="light" component={Link} to={`/customers/${c.id}?topup=1`}>
                        Add pack
                      </Button>
                    )}
                  </Group>
                </Card>
              ))}
            </Stack>
          )
        ) : (
          <Stack gap="xs">
            <Group justify="space-between" align="baseline">
              <Text fw={700} size="lg">Today</Text>
              <Text c="dimmed" size="sm">
                {today ? `${today.entries} ${today.entries === 1 ? 'entry' : 'entries'}` : ''}
              </Text>
            </Group>
            {today === null ? (
              <Loader mx="auto" />
            ) : today.visits.length === 0 ? (
              <Card withBorder ta="center" py="xl">
                <Text c="dimmed">No one has eaten yet today.</Text>
                <Text c="dimmed" size="sm">Search a name above to start.</Text>
              </Card>
            ) : (
              today.visits.map((v) => (
                <Card key={v.id} withBorder padding="sm" component={Link} to={`/customers/${v.customer.id}`} className="tap-row">
                  <Group wrap="nowrap" gap="sm">
                    <CustomerAvatar name={v.customer.name} size={36} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text fw={600} truncate>{v.customer.name}</Text>
                      <Text size="sm" c="dimmed">{timeOf(v.createdAt)}{-v.delta > 1 ? ` · ${-v.delta} people` : ''}</Text>
                    </Box>
                    <BalancePill credits={v.customer.credits} size="md" />
                  </Group>
                </Card>
              ))
            )}
          </Stack>
        )}
      </Stack>

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
