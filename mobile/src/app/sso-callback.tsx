import { Redirect } from 'expo-router'

/**
 * Clerk Google SSO returns to /sso-callback.
 * Expo Router needs this file to match that path.
 */
export default function SsoCallbackScreen() {
  return <Redirect href="/" />
}
