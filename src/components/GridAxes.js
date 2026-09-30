import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { GRID_CANVAS, GRID_MARGIN } from '../lib/gridCanvas';
// Canvas spans –margin..(scoreMax + margin). Ticks use the same math as .grid::before.
const MAJOR_TICKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MINOR_TICKS = Array.from({ length: 99 }, (_, index) => (index + 1) / 10).filter((value) => Math.round(value * 10) % 10 !== 0);
const pct = (value) => `${((value + GRID_MARGIN) / GRID_CANVAS) * 100}%`;
const pctInv = (value) => `${100 - ((value + GRID_MARGIN) / GRID_CANVAS) * 100}%`;
/**
 * Renders the numeric labels and ruler tick marks around all four edges of the
 * good-vs-fun grid. Purely decorative (aria-hidden) and pointer-events: none, so
 * it can be dropped inside any `.grid` container without affecting interaction.
 */
export function GridAxes() {
    return (_jsxs(_Fragment, { children: [MAJOR_TICKS.map((value) => (_jsx("span", { className: `grid-tick grid-tick-x${value === 10 ? ' grid-tick-end-x' : ''}`, style: { left: pct(value) }, "aria-hidden": "true", children: value }, `tick-x-${value}`))), MAJOR_TICKS.map((value) => (_jsx("span", { className: "grid-tick grid-tick-y", style: { top: pctInv(value) }, "aria-hidden": "true", children: value }, `tick-y-${value}`))), MINOR_TICKS.map((value) => (_jsx("span", { className: `grid-subtick grid-subtick-x${Math.round(value * 10) % 5 === 0 ? ' grid-subtick-mid' : ''}`, style: { left: pct(value) }, "aria-hidden": "true" }, `subtick-x-${value}`))), MINOR_TICKS.map((value) => (_jsx("span", { className: `grid-subtick grid-subtick-y${Math.round(value * 10) % 5 === 0 ? ' grid-subtick-mid' : ''}`, style: { top: pctInv(value) }, "aria-hidden": "true" }, `subtick-y-${value}`))), [1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (_jsx("span", { className: "grid-tick grid-tick-x grid-tick-x-top", style: { left: pct(value) }, "aria-hidden": "true", children: value }, `tick-x-top-${value}`))), MAJOR_TICKS.map((value) => (_jsx("span", { className: `grid-tick grid-tick-y grid-tick-y-right${value === 10 ? ' grid-tick-end-y-right' : ''}`, style: { top: pctInv(value) }, "aria-hidden": "true", children: value }, `tick-y-right-${value}`))), MINOR_TICKS.map((value) => (_jsx("span", { className: `grid-subtick grid-subtick-x grid-subtick-x-top${Math.round(value * 10) % 5 === 0 ? ' grid-subtick-mid' : ''}`, style: { left: pct(value) }, "aria-hidden": "true" }, `subtick-x-top-${value}`))), MINOR_TICKS.map((value) => (_jsx("span", { className: `grid-subtick grid-subtick-y grid-subtick-y-right${Math.round(value * 10) % 5 === 0 ? ' grid-subtick-mid' : ''}`, style: { top: pctInv(value) }, "aria-hidden": "true" }, `subtick-y-right-${value}`)))] }));
}
