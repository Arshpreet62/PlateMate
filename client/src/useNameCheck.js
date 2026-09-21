import { useDebouncedValue } from '@mantine/hooks'
import { useEffect, useState } from 'react'
import { findByName, findSimilar } from './db/customers.js'
import { normaliseName } from './db/schema.js'

const EMPTY = { taken: null, similar: [] }

// Tells the staff a name is already taken while they are still typing it,
// instead of after they tap Next. Both lookups are local index reads, so the
// debounce is only there to stop the UI flickering on every keystroke.
export function useNameCheck(name, { ignoreId } = {}) {
  const clean = normaliseName(name)
  const [debounced] = useDebouncedValue(clean, 250)
  const [result, setResult] = useState(EMPTY)

  useEffect(() => {
    if (!debounced) return setResult(EMPTY)
    let cancelled = false
    Promise.all([findByName(debounced), findSimilar(debounced)])
      .then(([taken, similar]) => {
        if (cancelled) return
        setResult({
          taken: taken && taken.id !== ignoreId ? taken : null,
          similar: similar.filter((c) => c.id !== ignoreId),
        })
      })
      .catch(() => !cancelled && setResult(EMPTY))
    return () => { cancelled = true }
  }, [debounced, ignoreId])

  // While the debounce is catching up, keep showing nothing rather than a
  // stale verdict about a different name.
  return debounced === clean ? result : EMPTY
}
