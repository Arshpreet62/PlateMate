import { useCallback, useRef, useState } from 'react'

// Stops a second tap that lands before React has re-rendered the button as
// disabled. The `busy` state drives the spinner, but state is set
// asynchronously, so on a janky frame a fast double tap can slip past it and
// run the action twice — which on a top-up means charging once and crediting
// twice. The ref flips synchronously, which closes that gap.
export function useAction() {
  const inFlight = useRef(false)
  const [busy, setBusy] = useState(false)

  const run = useCallback(async (fn) => {
    if (inFlight.current) return undefined
    inFlight.current = true
    setBusy(true)
    try {
      return await fn()
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }, [])

  return { busy, run }
}
