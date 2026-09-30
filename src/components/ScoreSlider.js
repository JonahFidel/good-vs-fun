import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatScore, POSITION_STEP } from '../lib/format';
export function ScoreSlider({ label, value, onChange, onCommit, onAdjustStart, disabled = false, }) {
    return (_jsxs("label", { className: "score-slider", children: [_jsxs("span", { className: "score-slider-header", children: [_jsx("span", { className: "score-slider-label", children: label }), _jsx("span", { className: "score-slider-value", children: formatScore(value) })] }), _jsx("input", { type: "range", className: "score-slider-input", min: 0, max: 10, step: POSITION_STEP, value: value, disabled: disabled, onChange: (event) => onChange(Number(event.target.value)), onPointerDown: onAdjustStart, onPointerUp: onCommit, onKeyUp: onCommit })] }));
}
