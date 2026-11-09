import type { ReactNode } from 'react'
import { useWideLayout } from '../../hooks/deck/useWideLayout'

export function SidebarCollapse({
  title,
  meta,
  heading = false,
  className,
  children,
}: {
  title: string
  meta?: string
  heading?: boolean
  className?: string
  children: ReactNode
}) {
  const isWide = useWideLayout()

  if (isWide) {
    return (
      <div className={className}>
        {heading ? <h3 className="deck-sidebar-section__title">{title}</h3> : null}
        {children}
      </div>
    )
  }

  return (
    <details className={className}>
      <summary className="deck-sidebar-collapse-summary">
        <span className="deck-sidebar-collapse-title">{title}</span>
        {meta ? <span className="deck-sidebar-collapse-meta">{meta}</span> : null}
      </summary>
      {children}
    </details>
  )
}
