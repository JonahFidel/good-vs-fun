import { formatScore, POSITION_STEP } from '../lib/format'

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
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerDown={onAdjustStart}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
      />
    </label>
  )
}
