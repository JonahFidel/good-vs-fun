import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './App.css';
import { AppRoutes } from './routes';
import { NavBar } from './components/NavBar';
export default function AppShell() {
    return (_jsxs("div", { className: "app", children: [_jsxs("header", { className: "header", children: [_jsx("p", { className: "header-brand", children: "Good vs. Fun" }), _jsx(NavBar, {})] }), _jsx("main", { className: "layout", children: _jsx(AppRoutes, {}) })] }));
}
