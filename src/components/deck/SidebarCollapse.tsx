import type { MouseEvent, ReactNode } from 'react'
import { useWideLayout } from '../../hooks/deck/useWideLayout'

export function SidebarCollapse({
  title,
  meta,
  heading = false,
  className,
  actions,
  children,
}: {
  title: string
  meta?: string
  heading?: boolean
  className?: string
  actions?: ReactNode
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

  const preventToggleFromActions = (event: MouseEvent<HTMLElement>) => {
    const target = event.target
    const element =
      target instanceof Element
        ? target
        : target instanceof Node
          ? target.parentElement
          : null
    if (element?.closest('button, input, textarea, label')) {
      event.preventDefault()
    }
  }

  return (
    <details className={className}>
      <summary
        className="deck-sidebar-collapse-summary"
        onClick={preventToggleFromActions}
      >
        <span className="deck-sidebar-collapse-title">{title}</span>
        {meta ? <span className="deck-sidebar-collapse-meta">{meta}</span> : null}
        {actions}
      </summary>
      {children}
    </details>
  )
}
