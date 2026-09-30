import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { formatScore } from '../lib/format';
import { scoreToPlotPercent } from '../lib/gridCanvas';
export function MoviePoints({ groups, draggingIds, selectedMovieId, hover, onGroupPointerDown, onLabelPointerDown, onHighlight, onClearHover, }) {
    return (_jsx(_Fragment, { children: groups.map((group) => {
            const ids = group.items.map((item) => item.id);
            const left = scoreToPlotPercent(group.good, 'x');
            const top = scoreToPlotPercent(group.fun, 'y');
            const isDragging = draggingIds
                ? ids.some((id) => draggingIds.includes(id))
                : false;
            const isGridHighlighted = hover?.from === 'list' && ids.includes(hover.id);
            const isGridSelected = selectedMovieId !== null && ids.includes(selectedMovieId);
            const onlyItem = group.items.length === 1 ? group.items[0] : null;
            return (_jsxs("div", { className: [
                    'movie-point',
                    isDragging ? 'dragging' : '',
                    isGridSelected ? 'movie-point--selected' : '',
                    isGridHighlighted ? 'movie-point--highlighted' : '',
                ]
                    .filter(Boolean)
                    .join(' '), style: { left: `${left}%`, top: `${top}%` }, onPointerDown: onGroupPointerDown(group.key, ids, group.items[0].id), onMouseEnter: onlyItem ? () => onHighlight(onlyItem.id) : undefined, onMouseLeave: onlyItem ? onClearHover : undefined, "data-group-key": group.key, children: [_jsx("span", { className: "movie-label", onPointerDown: (event) => {
                            event.stopPropagation();
                        }, children: group.items.map((item) => (_jsx("span", { className: [
                                'movie-label-line',
                                selectedMovieId === item.id ? 'movie-label-line--selected' : '',
                                hover?.from === 'list' && hover.id === item.id
                                    ? 'movie-label-line--linked'
                                    : '',
                            ]
                                .filter(Boolean)
                                .join(' '), children: _jsx("span", { className: "movie-label-title", "data-movie-id": item.id, onPointerDownCapture: onLabelPointerDown(item.id), onMouseEnter: () => onHighlight(item.id), onMouseLeave: onClearHover, children: item.title }) }, item.id))) }), _jsxs("span", { className: "movie-point-score", "aria-hidden": "true", children: ["Good ", formatScore(group.good), " \u00B7 Fun ", formatScore(group.fun)] })] }, group.key));
        }) }));
}
