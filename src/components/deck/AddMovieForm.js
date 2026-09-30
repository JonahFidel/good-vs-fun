import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ScoreSlider } from '../ScoreSlider';
import { snapScoreToStep } from '../../lib/format';
export function AddMovieForm({ title, fun, good, onTitleChange, onFunChange, onGoodChange, onSubmit, }) {
    return (_jsxs("div", { className: "deck-sidebar-section deck-sidebar-section--add", children: [_jsx("h3", { className: "deck-sidebar-section__title", children: "Add a movie" }), _jsxs("form", { className: "movie-form movie-form--compact", onSubmit: onSubmit, children: [_jsxs("label", { className: "field", children: [_jsx("span", { children: "Movie title" }), _jsx("input", { type: "text", placeholder: "e.g. Jurassic Park", value: title, onChange: (event) => onTitleChange(event.target.value), required: true })] }), _jsxs("div", { className: "score-sliders score-sliders--add", children: [_jsx(ScoreSlider, { label: "Fun", value: fun, onChange: (value) => onFunChange(snapScoreToStep(value)) }), _jsx(ScoreSlider, { label: "Good", value: good, onChange: (value) => onGoodChange(snapScoreToStep(value)) })] }), _jsx("button", { type: "submit", children: "Add movie" })] })] }));
}
