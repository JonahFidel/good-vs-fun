import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { scoreToPlotPercent } from '../lib/gridCanvas';
export function GhostPoints({ groups, variant = 1, }) {
    const variantClass = variant === 2 ? 'ghost-point--2' : 'ghost-point--1';
    return (_jsx(_Fragment, { children: groups.map((group) => {
            const left = scoreToPlotPercent(group.good, 'x');
            const top = scoreToPlotPercent(group.fun, 'y');
            return (_jsx("div", { className: `movie-point ghost-point ${variantClass}`, style: { left: `${left}%`, top: `${top}%` }, children: _jsx("span", { className: "movie-label", children: group.items.map((item) => (_jsx("span", { className: "movie-label-line", children: _jsx("span", { className: "movie-label-title", children: item.title }) }, item.id))) }) }, `ghost-${variant}-${group.key}`));
        }) }));
}
