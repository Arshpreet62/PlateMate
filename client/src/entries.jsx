import { Button, Group, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { spendEntries, undoEntry } from './db/credits.js'

export function vibrate(pattern = 40) {
  try { navigator.vibrate?.(pattern) } catch { /* unsupported */ }
}

async function undo(toastId, customer, transactionId, onChange) {
  notifications.hide(toastId)
  try {
    const result = await undoEntry(transactionId)
    onChange?.(result)
    notifications.show({ color: 'blue', message: `Undone — ${customer.name} has ${result.customer.credits} left` })
  } catch (err) {
    notifications.show({ color: 'red', message: err.message })
  }
}

// Deducts entries and shows a toast with Undo, so the counter flow stays one
// tap. This toast is the main way to take a mistake back, so it lingers.
export async function deductEntries(customer, count, { onChange } = {}) {
  try {
    const result = await spendEntries(customer.id, { count })
    vibrate()
    onChange?.(result)
    const toastId = `entry-${result.transaction.id}`
    notifications.show({
      id: toastId,
      color: 'green',
      autoClose: 12000,
      withCloseButton: false,
      message: (
        <Group justify="space-between" wrap="nowrap">
          <div>
            <Text fw={700}>{customer.name} — {count} {count === 1 ? 'entry' : 'entries'} used</Text>
            <Text size="sm" c="dimmed">{result.customer.credits} left</Text>
          </div>
          <Button size="sm" variant="light" color="blue" onClick={() => undo(toastId, customer, result.transaction.id, onChange)}>
            Undo
          </Button>
        </Group>
      ),
    })
    return result
  } catch (err) {
    vibrate([60, 40, 60])
    notifications.show({ color: 'red', message: err.message })
    return null
  }
}
