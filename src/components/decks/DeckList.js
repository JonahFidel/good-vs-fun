import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { alertExampleDeckReadOnly } from '../../lib/exampleDeck';
export function DeckList({ decks, selectedDeckId, onReorderStart, onMoveDeck, onRename, onDelete, }) {
    const [draggingDeckId, setDraggingDeckId] = useState(null);
    const [deckDragOverId, setDeckDragOverId] = useState(null);
    return (_jsx("ul", { className: "deck-list", children: decks.map((deck) => (_jsxs("li", { className: [
                deck.id === selectedDeckId ? 'active' : '',
                deckDragOverId === deck.id ? 'drag-over' : '',
                deck.isExample ? 'deck-list-item--example' : '',
            ]
                .filter(Boolean)
                .join(' '), draggable: true, onDragStart: (event) => {
                if (deck.isExample) {
                    event.preventDefault();
                    alertExampleDeckReadOnly();
                    return;
                }
                onReorderStart();
                setDraggingDeckId(deck.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', deck.id);
            }, onDragEnd: () => {
                setDraggingDeckId(null);
                setDeckDragOverId(null);
            }, onDragOver: (event) => {
                event.preventDefault();
                if (draggingDeckId) {
                    setDeckDragOverId(deck.id);
                    event.dataTransfer.dropEffect = 'move';
                }
            }, onDrop: (event) => {
                event.preventDefault();
                if (deck.isExample) {
                    return;
                }
                const draggedId = draggingDeckId ?? event.dataTransfer.getData('text/plain');
                if (!draggedId || draggedId === deck.id) {
                    return;
                }
                onMoveDeck(draggedId, deck.id);
                setDraggingDeckId(null);
                setDeckDragOverId(null);
            }, children: [_jsxs(Link, { className: "deck-select", to: `/deck/${deck.id}/movies`, children: [_jsxs("span", { children: [deck.name, deck.isExample && _jsx("span", { className: "deck-example-badge", children: "Example" })] }), _jsxs("span", { className: "deck-meta", children: [(deck.movieCount ?? 0).toString(), " films"] })] }), !deck.isExample && (_jsxs("div", { className: "deck-actions", children: [_jsx("button", { type: "button", onClick: () => onRename(deck), children: "Rename" }), _jsx("button", { type: "button", className: "deck-action-delete", onClick: () => onDelete(deck), children: "Delete" })] }))] }, deck.id))) }));
}
