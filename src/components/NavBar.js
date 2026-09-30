import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { UserButton, useAuth } from '@clerk/clerk-react';
import { NavLink } from 'react-router-dom';
import { useIsHydrated } from '../hooks/useIsHydrated';
export function NavBar() {
    const hydrated = useIsHydrated();
    const { isSignedIn, isLoaded } = useAuth();
    const ready = hydrated && isLoaded;
    return (_jsx("nav", { className: "nav", "aria-busy": !ready, children: _jsxs("div", { className: "nav-links", children: [_jsx(NavLink, { to: "/decks", className: ({ isActive }) => (isActive ? 'nav-link active' : 'nav-link'), children: "Decks" }), ready ? (isSignedIn ? (_jsx(UserButton, { afterSignOutUrl: "/" })) : (_jsxs(_Fragment, { children: [_jsx(NavLink, { to: "/sign-in", className: "nav-link", children: "Sign in" }), _jsx(NavLink, { to: "/sign-up", className: "nav-link nav-link-primary", children: "Sign up" })] }))) : (_jsx("span", { className: "nav-auth-placeholder", "aria-hidden": "true" }))] }) }));
}
