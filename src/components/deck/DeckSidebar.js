import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatTitle, snapScoreToStep } from '../../lib/format';
import { AddMovieForm } from './AddMovieForm';
import { MovieList } from './MovieList';
import { MovieSelectionPanel } from './MovieSelectionPanel';
export function DeckSidebar({ deckName, isExampleDeck, error, loading, movies, selectedMovieId, hover, onBackgroundPointerDown, onAddMovie, onRenameSelected, onDeleteSelected, onScoreAdjustStart, onFunChange, onGoodChange, onScoreCommit, onMoviePointerDown, onHighlightFromList, onClearHover, onRemoveMovie, children, }) {
    const [title, setTitle] = useState('');
    const [fun, setFun] = useState(5);
    const [good, setGood] = useState(5);
    const selectedMovie = movies.find((movie) => movie.id === selectedMovieId) ?? null;
    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmedTitle = title.trim();
        if (!trimmedTitle) {
            return;
        }
        const added = await onAddMovie({
            title: formatTitle(trimmedTitle),
            fun: snapScoreToStep(fun),
            good: snapScoreToStep(good),
        });
        if (added) {
            setTitle('');
        }
    };
    return (_jsxs("aside", { className: "panel deck-sidebar", onPointerDown: onBackgroundPointerDown, children: [_jsx("div", { className: "deck-sidebar-section deck-sidebar-section--header", children: _jsxs("div", { className: "deck-sidebar-top", children: [_jsxs("div", { className: "deck-sidebar-title-block", children: [_jsx("p", { className: "eyebrow", children: isExampleDeck ? 'Example deck' : 'Deck' }), _jsxs("h2", { children: [deckName || 'Loading…', isExampleDeck && _jsx("span", { className: "deck-example-badge", children: "Example" })] })] }), _jsx(Link, { className: "deck-sidebar-back", to: "/decks", children: "\u2190 Back to decks" })] }) }), children, error && _jsx("p", { className: "error-banner", children: error }), loading && _jsx("p", { className: "status-line", children: "Syncing changes\u2026" }), !isExampleDeck && (_jsx(AddMovieForm, { title: title, fun: fun, good: good, onTitleChange: setTitle, onFunChange: setFun, onGoodChange: setGood, onSubmit: (event) => void handleSubmit(event) })), selectedMovie && (_jsx(MovieSelectionPanel, { movie: selectedMovie, isExampleDeck: isExampleDeck, onRename: onRenameSelected, onDelete: onDeleteSelected, onScoreAdjustStart: onScoreAdjustStart, onFunChange: onFunChange, onGoodChange: onGoodChange, onScoreCommit: onScoreCommit })), _jsx(MovieList, { movies: movies, isExampleDeck: isExampleDeck, selectedMovieId: selectedMovieId, hover: hover, onItemPointerDown: onMoviePointerDown, onHighlight: onHighlightFromList, onClearHover: onClearHover, onRemove: onRemoveMovie })] }));
}
