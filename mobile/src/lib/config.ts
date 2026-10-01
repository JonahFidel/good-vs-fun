import Constants from 'expo-constants'

type MobileExtra = {
  clerkPublishableKey?: string
  apiBaseUrl?: string
}

function extra(): MobileExtra {
  return (Constants.expoConfig?.extra ?? {}) as MobileExtra
}

export function clerkPublishableKey() {
  const key =
    extra().clerkPublishableKey || process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  if (!key) {
    throw new Error(
      'Missing Clerk publishable key. The app reads VITE_CLERK_PUBLISHABLE_KEY from the repo root .env.',
    )
  }
  return key
}

export function apiBaseUrl() {
  const base =
    process.env.EXPO_PUBLIC_API_BASE_URL ||
    extra().apiBaseUrl ||
    'http://localhost:3001'
  return base.endsWith('/') ? base.slice(0, -1) : base
}
