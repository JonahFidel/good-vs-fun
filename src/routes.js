import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { SignIn, SignUp, useAuth } from '@clerk/clerk-react';
import { Navigate, Outlet, Route, Routes, generatePath, useParams } from 'react-router-dom';
import { useIsHydrated } from './hooks/useIsHydrated';
import { DecksPage } from './views/DecksPage';
import { DeckPage } from './views/DeckPage';
function ProtectedLayout() {
    const hydrated = useIsHydrated();
    const { isSignedIn, isLoaded } = useAuth();
    if (!hydrated || !isLoaded) {
        return _jsx("p", { className: "status-line app-loading", children: "Loading\u2026" });
    }
    if (!isSignedIn) {
        return _jsx(Navigate, { to: "/sign-in", replace: true });
    }
    return _jsx(Outlet, {});
}
export function AppRoutes() {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/decks", replace: true }) }), _jsx(Route, { path: "/sign-in/*", element: _jsx("div", { className: "sign-in-page", children: _jsx(SignIn, { routing: "path", path: "/sign-in", signUpUrl: "/sign-up", afterSignInUrl: "/decks" }) }) }), _jsx(Route, { path: "/sign-up/*", element: _jsx("div", { className: "sign-in-page", children: _jsx(SignUp, { routing: "path", path: "/sign-up", signInUrl: "/sign-in", afterSignUpUrl: "/decks" }) }) }), _jsxs(Route, { element: _jsx(ProtectedLayout, {}), children: [_jsx(Route, { path: "/decks", element: _jsx(DecksPage, {}) }), _jsx(Route, { path: "/deck/:deckId/movies", element: _jsx(DeckPage, {}) }), _jsx(Route, { path: "/decks/:deckId", element: _jsx(LegacyDeckRedirect, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/decks", replace: true }) })] }));
}
function LegacyDeckRedirect() {
    // React Router v6/v7 doesn't interpolate params in a plain string in Navigate,
    // so we generate the target path explicitly.
    const { deckId } = useParams();
    // This component should never render without params, but keep it safe.
    const id = typeof deckId === 'string' ? deckId : '';
    return _jsx(Navigate, { to: generatePath('/deck/:deckId/movies', { deckId: id }), replace: true });
}
