import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { GhostPoints } from './GhostPoints';
import { GridAxes } from './GridAxes';
import { MoviePoints } from './MoviePoints';
import { PlotGridZoom } from './PlotGridZoom';
export function PlotPanel({ isExampleDeck, gridRef, canUndo, canRedo, onUndo, onRedo, onClearSelection, ghostDeckId, ghost2DeckId, ghostGroups, ghost2Groups, movieGroups, draggingIds, selectedMovieId, hover, onGroupPointerDown, onLabelPointerDown, onHighlight, onClearHover, }) {
    const handleBackgroundPointerDown = (event) => {
        const target = event.target;
        if (target.closest('.movie-point') || target.closest('.grid-toolbar')) {
            return;
        }
        onClearSelection();
    };
    return (_jsx("section", { className: "grid-panel", children: _jsxs("div", { className: ['grid-wrapper', isExampleDeck ? 'grid-wrapper--example' : '']
                .filter(Boolean)
                .join(' '), onPointerDown: handleBackgroundPointerDown, children: [!isExampleDeck && (_jsxs("div", { className: "grid-toolbar", children: [_jsx("button", { type: "button", className: "btn-undo", onClick: () => void onUndo(), disabled: !canUndo, title: "Undo last move (\u2318Z)", children: "\u21A9 Undo" }), _jsx("button", { type: "button", className: "btn-undo", onClick: () => void onRedo(), disabled: !canRedo, title: "Redo last move (\u2318\u21E7Z)", children: "\u21AA Redo" })] })), _jsx("div", { className: "grid-axis grid-axis-y", children: "Fun" }), _jsx("div", { className: "grid-axis grid-axis-x", children: "Good" }), _jsxs(PlotGridZoom, { ref: gridRef, children: [_jsx(GridAxes, {}), ghostDeckId && _jsx(GhostPoints, { groups: ghostGroups, variant: 1 }), ghost2DeckId && _jsx(GhostPoints, { groups: ghost2Groups, variant: 2 }), _jsx(MoviePoints, { groups: movieGroups, draggingIds: draggingIds, selectedMovieId: selectedMovieId, hover: hover, onGroupPointerDown: onGroupPointerDown, onLabelPointerDown: onLabelPointerDown, onHighlight: onHighlight, onClearHover: onClearHover })] })] }) }));
}
