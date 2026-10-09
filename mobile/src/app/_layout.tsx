import { ClerkProvider } from '@clerk/expo'
import { tokenCache } from '@clerk/expo/token-cache'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { clerkDevelopmentModeWarningProps } from '@/lib/clerkDevWarning'
import { clerkPublishableKey } from '@/lib/config'
import { colors } from '@/theme'

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={clerkPublishableKey()}
      tokenCache={tokenCache}
      {...clerkDevelopmentModeWarningProps(__DEV__)}
    >
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </SafeAreaProvider>
    </ClerkProvider>
  )
}
