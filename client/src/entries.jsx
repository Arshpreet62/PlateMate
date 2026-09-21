import { notifications } from '@mantine/notifications'
import { spendEntries } from './db/credits.js'

export function vibrate(pattern = 40) {
  try { navigator.vibrate?.(pattern) } catch { /* unsupported */ }
}

// Deducts an entry and confirms it briefly. There is no Undo in here any more:
// a toast that has to be caught before it disappears is the wrong home for the
// one action that takes a mistake back, and it sat in the way of the next
// customer. Undo lives on the history row instead, where it can be found on
// purpose and never expires.
export async function deductEntries(customer, count = 1, { onChange } = {}) {
  try {
    const result = await spendEntries(customer.id, { count })
    vibrate()
    onChange?.(result)
    notifications.show({
      color: 'green',
      message: `${customer.name} — ${count === 1 ? '1 entry' : `${count} entries`} used · ${result.customer.credits} left`,
    })
    return result
  } catch (err) {
    vibrate([60, 40, 60])
    notifications.show({ color: 'red', message: err.message })
    return null
  }
}
