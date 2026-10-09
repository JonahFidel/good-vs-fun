// Documented ClerkProvider option that disables only the development-keys console warning.
// https://clerk.com/docs/expo/reference/components/clerk-provider
export function clerkDevelopmentModeWarningProps(isDevelopment: boolean) {
  return {
    unsafe_disableDevelopmentModeConsoleWarning: isDevelopment,
  }
}
