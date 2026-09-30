import { jsx as _jsx } from "react/jsx-runtime";
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import './index.css';
import AppShell from './AppShell';
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
    throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');
}
createRoot(document.getElementById('root')).render(_jsx(StrictMode, { children: _jsx(ClerkProvider, { publishableKey: publishableKey, children: _jsx(BrowserRouter, { children: _jsx(AppShell, {}) }) }) }));
