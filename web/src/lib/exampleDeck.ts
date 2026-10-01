const EXAMPLE_DECK_ALERT =
  'Example decks are read-only. Create your own deck to add, move, or remove movies.'

let lastAlertAt = 0

export function alertExampleDeckReadOnly() {
  const now = Date.now()
  if (now - lastAlertAt < 1500) {
    return
  }
  lastAlertAt = now
  window.alert(EXAMPLE_DECK_ALERT)
}
