import { notifications } from '@mantine/notifications'
import { spendEntries } from './db/credits.js'

// Two pulses, not one: after a meal is taken the screen changes too, but a
// buzz that is distinct from every other tap is one more channel saying it
// worked.
export function vibrate(pattern = 40) {
  try { navigator.vibrate?.(pattern) } catch { /* unsupported */ }
}

// Deducts an entry. There is deliberately no success toast: a bar at the
// bottom of the screen, under the hand holding the phone, was being missed,
// and an owner who thinks the tap failed taps again and takes a second meal.
// Confirmation now belongs to the screen the tap happened on, which can show
// it where the thumb already is. Errors keep a toast — they have no in-place
// home, and the screen has not changed.
export async function deductEntries(customer, count = 1, { onChange } = {}) {
  try {
    const result = await spendEntries(customer.id, { count })
    vibrate([35, 45, 35])
    onChange?.(result)
    return result
  } catch (err) {
    vibrate([60, 40, 60])
    notifications.show({ color: 'red', message: err.message })
    return null
  }
}
