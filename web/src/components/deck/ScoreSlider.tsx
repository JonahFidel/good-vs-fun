import { useEffect, useRef, type CSSProperties } from 'react'
import { clampPercent, formatScore, POSITION_STEP } from '../../lib/format'

type Props = {
  label: string
  value: number
  onChange: (value: number) => void
  onCommit?: () => void
  onAdjustStart?: () => void
  disabled?: boolean
}

export function ScoreSlider({
  label,
  value,
  onChange,
  onCommit,
  onAdjustStart,
  disabled = false,
}: Props) {
  const commitOnRelease = Boolean(onCommit)
  const adjustingRef = useRef(false)
  const onCommitRef = useRef(onCommit)
  const onAdjustStartRef = useRef(onAdjustStart)

  useEffect(() => {
    onCommitRef.current = onCommit
    onAdjustStartRef.current = onAdjustStart
  }, [onAdjustStart, onCommit])

  // Selected Fun/Good live in an overflow sheet. If the finger leaves the
  // 44px track, input pointerup never fires and the new score is not saved.
  // Commit on window pointerup/touchend instead; the adjusting flag makes
  // iOS firing both for one gesture a no-op the second time.
  useEffect(() => {
    if (!commitOnRelease) {
      return
    }

    const endAdjust = () => {
      if (!adjustingRef.current) {
        return
      }
      adjustingRef.current = false
      onCommitRef.current?.()
    }

    window.addEventListener('pointerup', endAdjust)
    window.addEventListener('pointercancel', endAdjust)
    window.addEventListener('touchend', endAdjust)
    window.addEventListener('touchcancel', endAdjust)
    return () => {
      window.removeEventListener('pointerup', endAdjust)
      window.removeEventListener('pointercancel', endAdjust)
      window.removeEventListener('touchend', endAdjust)
      window.removeEventListener('touchcancel', endAdjust)
    }
  }, [commitOnRelease])

  return (
    <label className="score-slider">
      <span className="score-slider-header">
        <span className="score-slider-label">{label}</span>
        <span className="score-slider-value">{formatScore(value)}</span>
      </span>
      <input
        type="range"
        className="score-slider-input"
        min={0}
        max={10}
        step={POSITION_STEP}
        value={value}
        disabled={disabled}
        style={
          { '--score-percent': `${clampPercent(value * 10)}%` } as CSSProperties
        }
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerDown={() => {
          if (disabled) {
            return
          }
          if (commitOnRelease) {
            adjustingRef.current = true
          }
          onAdjustStartRef.current?.()
        }}
        onKeyUp={() => onCommitRef.current?.()}
      />
    </label>
  )
}
