import { useHostedAuth } from '@clerk/expo/hosted-auth'
import * as WebBrowser from 'expo-web-browser'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, radii } from '@/theme'

WebBrowser.maybeCompleteAuthSession()

type HostedMode = 'sign-in' | 'sign-up'

export function SignInScreen() {
  const { startHostedAuth } = useHostedAuth()
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const openClerk = async (mode: HostedMode) => {
    setFormError(null)
    setBusy(true)
    try {
      const result = await startHostedAuth({ mode })
      const sessionType = result.authSessionResult?.type
      if (result.createdSessionId || sessionType === 'cancel' || sessionType === 'dismiss') {
        return
      }
      setFormError('Clerk sign-in did not finish. Try again.')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not open Clerk.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.brand}>Good vs. Fun</Text>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subhead}>
          This opens Clerk, the same account you use on the website. Google and email both work.
        </Text>

        {formError ? <Text style={styles.error}>{formError}</Text> : null}

        <Pressable
          style={[styles.primaryButton, busy && styles.disabled]}
          disabled={busy}
          onPress={() => void openClerk('sign-in')}
        >
          <Text style={styles.primaryLabel}>{busy ? 'Opening Clerk…' : 'Sign in with Clerk'}</Text>
        </Pressable>

        <Pressable onPress={() => void openClerk('sign-up')} disabled={busy}>
          <Text style={styles.switchMode}>Need an account? Sign up with Clerk</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    marginHorizontal: 20,
    marginTop: 48,
    padding: 20,
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  brand: {
    color: colors.brand,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.heading,
    fontSize: 28,
    fontWeight: '700',
  },
  subhead: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  error: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    backgroundColor: colors.dangerSurface,
    color: colors.danger,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.pill,
    backgroundColor: colors.heading,
  },
  disabled: {
    opacity: 0.6,
  },
  primaryLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  switchMode: {
    textAlign: 'center',
    color: colors.heading,
    fontWeight: '700',
  },
})
