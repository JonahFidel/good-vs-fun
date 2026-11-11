import { useEffect, useState } from 'react'
import { subscribeExampleDeckNotice } from '../../lib/exampleDeck'

const NOTICE_MS = 5000

export function useExampleDeckNotice() {
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let timer = 0
    const unsubscribe = subscribeExampleDeckNotice((message) => {
      window.clearTimeout(timer)
      setNotice(message)
      if (message) {
        timer = window.setTimeout(() => setNotice(null), NOTICE_MS)
      }
    })
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [])

  return notice
}
