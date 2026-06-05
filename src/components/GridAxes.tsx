import { GRID_CANVAS, GRID_MARGIN } from '../lib/gridCanvas'

// Canvas spans –margin..(scoreMax + margin). Ticks use the same math as .grid::before.

const MAJOR_TICKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const MINOR_TICKS = Array.from({ length: 99 }, (_, index) => (index + 1) / 10).filter(
  (value) => Math.round(value * 10) % 10 !== 0,
)

const pct = (value: number) => `${((value + GRID_MARGIN) / GRID_CANVAS) * 100}%`
const pctInv = (value: number) => `${100 - ((value + GRID_MARGIN) / GRID_CANVAS) * 100}%`

/**
 * Renders the numeric labels and ruler tick marks around all four edges of the
 * good-vs-fun grid. Purely decorative (aria-hidden) and pointer-events: none, so
 * it can be dropped inside any `.grid` container without affecting interaction.
 */
export function GridAxes() {
  return (
    <>
      {MAJOR_TICKS.map((value) => (
        <span
          key={`tick-x-${value}`}
          className={`grid-tick grid-tick-x${value === 10 ? ' grid-tick-end-x' : ''}`}
          style={{ left: pct(value) }}
          aria-hidden="true"
        >
          {value}
        </span>
      ))}
      {MAJOR_TICKS.map((value) => (
        <span
          key={`tick-y-${value}`}
          className={`grid-tick grid-tick-y${value === 10 ? ' grid-tick-end-y' : ''}`}
          style={{ top: pctInv(value) }}
          aria-hidden="true"
        >
          {value}
        </span>
      ))}
      {MINOR_TICKS.map((value) => (
        <span
          key={`subtick-x-${value}`}
          className={`grid-subtick grid-subtick-x${
            Math.round(value * 10) % 5 === 0 ? ' grid-subtick-mid' : ''
          }`}
          style={{ left: pct(value) }}
          aria-hidden="true"
        />
      ))}
      {MINOR_TICKS.map((value) => (
        <span
          key={`subtick-y-${value}`}
          className={`grid-subtick grid-subtick-y${
            Math.round(value * 10) % 5 === 0 ? ' grid-subtick-mid' : ''
          }`}
          style={{ top: pctInv(value) }}
          aria-hidden="true"
        />
      ))}
      {/* Top axis — stops at 9; value-10 corner is covered by the right axis */}
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
        <span
          key={`tick-x-top-${value}`}
          className="grid-tick grid-tick-x grid-tick-x-top"
          style={{ left: pct(value) }}
          aria-hidden="true"
        >
          {value}
        </span>
      ))}
      {MAJOR_TICKS.map((value) => (
        <span
          key={`tick-y-right-${value}`}
          className={`grid-tick grid-tick-y grid-tick-y-right${
            value === 10 ? ' grid-tick-end-y' : ''
          }`}
          style={{ top: pctInv(value) }}
          aria-hidden="true"
        >
          {value}
        </span>
      ))}
      {MINOR_TICKS.map((value) => (
        <span
          key={`subtick-x-top-${value}`}
          className={`grid-subtick grid-subtick-x grid-subtick-x-top${
            Math.round(value * 10) % 5 === 0 ? ' grid-subtick-mid' : ''
          }`}
          style={{ left: pct(value) }}
          aria-hidden="true"
        />
      ))}
      {MINOR_TICKS.map((value) => (
        <span
          key={`subtick-y-right-${value}`}
          className={`grid-subtick grid-subtick-y grid-subtick-y-right${
            Math.round(value * 10) % 5 === 0 ? ' grid-subtick-mid' : ''
          }`}
          style={{ top: pctInv(value) }}
          aria-hidden="true"
        />
      ))}
    </>
  )
}
