import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { alertExampleDeckReadOnly } from '../../lib/exampleDeck';
import { formatScore } from '../../lib/format';
export function MovieList({ movies, isExampleDeck, selectedMovieId, hover, onItemPointerDown, onHighlight, onClearHover, onRemove, }) {
    const [sort, setSort] = useState('title');
    const sortedMovies = useMemo(() => {
        const nextMovies = [...movies];
        switch (sort) {
            case 'fun':
                return nextMovies.sort((a, b) => b.fun === a.fun ? a.title.localeCompare(b.title) : b.fun - a.fun);
            case 'good':
                return nextMovies.sort((a, b) => b.good === a.good ? a.title.localeCompare(b.title) : b.good - a.good);
            case 'title':
            default:
                return nextMovies.sort((a, b) => a.title.localeCompare(b.title));
        }
    }, [movies, sort]);
    useEffect(() => {
        if (!selectedMovieId) {
            return;
        }
        document
            .querySelector(`[data-movie-list-id="${selectedMovieId}"]`)
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [selectedMovieId]);
    const handleExampleDelete = (event) => {
        event.preventDefault();
        event.stopPropagation();
        alertExampleDeckReadOnly();
    };
    return (_jsxs("div", { className: "deck-sidebar-section deck-sidebar-section--list movie-list", children: [_jsx("h3", { className: "deck-sidebar-section__title deck-sidebar-section__title--inline", children: "Movies" }), _jsx("div", { className: "movie-list-header", children: _jsxs("label", { children: ["Sort movies", _jsxs("select", { value: sort, onChange: (event) => setSort(event.target.value), children: [_jsx("option", { value: "title", children: "Title" }), _jsx("option", { value: "fun", children: "Fun" }), _jsx("option", { value: "good", children: "Good" })] })] }) }), _jsx("ul", { children: sortedMovies.map((movie) => (_jsxs("li", { "data-movie-list-id": movie.id, className: [
                        selectedMovieId === movie.id ? 'movie-list-item--selected' : '',
                        hover?.from === 'grid' && hover.id === movie.id
                            ? 'movie-list-item--highlighted'
                            : '',
                    ]
                        .filter(Boolean)
                        .join(' ') || undefined, onPointerDown: onItemPointerDown(movie.id), onMouseEnter: () => onHighlight(movie.id), onMouseLeave: onClearHover, children: [_jsxs("div", { className: "movie-list-title", children: [_jsx("strong", { title: movie.title, children: movie.title }), isExampleDeck ? (_jsx("button", { type: "button", className: "movie-delete", "aria-label": `Remove ${movie.title}`, onClick: handleExampleDelete, children: "\u00D7" })) : (_jsx("button", { type: "button", className: "movie-delete", "aria-label": `Remove ${movie.title}`, onClick: () => onRemove(movie.id), children: "\u00D7" }))] }), _jsxs("span", { className: "movie-list-scores", children: ["F ", formatScore(movie.fun), " \u00B7 G ", formatScore(movie.good)] })] }, movie.id))) })] }));
}
