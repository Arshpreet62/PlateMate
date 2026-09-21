import { Button, Drawer, Stack } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useEffect, useState } from 'react'
import { topup } from '../db/credits.js'
import { vibrate } from '../entries.jsx'
import { PlanPicker } from './PlanPicker.jsx'

export function TopupModal({ opened, onClose, customer, onDone }) {
  const [plan, setPlan] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (opened) setPlan(null)
  }, [opened])

  const submit = async () => {
    setLoading(true)
    try {
      const result = await topup(customer.id, plan.packId ? { packId: plan.packId } : { credits: plan.credits })
      vibrate()
      notifications.show({ color: 'green', message: `${customer.name} now has ${result.customer.credits} entries` })
      onDone(result)
      onClose()
    } catch (err) {
      notifications.show({ color: 'red', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer opened={opened} onClose={onClose} title={`${customer.credits > 0 ? 'Add a plan' : 'Renew plan'} — ${customer.name}`}>
      <Stack pb="md">
        {opened && <PlanPicker value={plan} onChange={setPlan} />}
        <Button size="xl" loading={loading} onClick={submit} disabled={!plan}>
          {plan ? `Start ${plan.name ?? `${plan.credits} entries`}` : 'Pick a plan'}
        </Button>
      </Stack>
    </Drawer>
  )
}
