const fs = require('node:fs')
const path = require('node:path')

const pkg = require('./package.json')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return
  }

  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const eq = trimmed.indexOf('=')
    if (eq <= 0) {
      continue
    }

    const key = trimmed.slice(0, eq).trim()
    if (process.env[key]) {
      continue
    }

    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    process.env[key] = value
  }
}

const repoRoot = path.join(__dirname, '..')
loadEnvFile(path.join(repoRoot, '.env'))
loadEnvFile(path.join(repoRoot, '.env.local'))

if (
  !process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  process.env.VITE_CLERK_PUBLISHABLE_KEY
) {
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY =
    process.env.VITE_CLERK_PUBLISHABLE_KEY
}

const clerkPublishableKey =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? ''
const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3001'
).replace(/\/$/, '')

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: 'Good vs Fun',
  slug: 'good-vs-fun',
  version: pkg.version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'goodvsfun',
  userInterfaceStyle: 'light',
  backgroundColor: '#f3f4f6',
  ios: {
    bundleIdentifier: 'app.goodvsfun.mobile',
    supportsTablet: true,
  },
  android: {
    package: 'app.goodvsfun.mobile',
    adaptiveIcon: {
      backgroundColor: '#f0ede8',
      foregroundImage: './assets/icon.png',
    },
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-web-browser'],
  extra: {
    clerkPublishableKey,
    apiBaseUrl,
  },
}
