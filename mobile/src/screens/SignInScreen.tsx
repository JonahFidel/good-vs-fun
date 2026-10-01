import { useSignIn, useSignUp } from '@clerk/expo'
import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { clerkErrorMessage } from '@/lib/clerkErrors'
import { colors, radii } from '@/theme'

type Mode = 'sign-in' | 'sign-up'

export function SignInScreen() {
  const { signIn, fetchStatus: signInStatus } = useSignIn()
  const { signUp, fetchStatus: signUpStatus } = useSignUp()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const busy = signInStatus === 'fetching' || signUpStatus === 'fetching'
  const verifyingSignIn = signIn.status === 'needs_client_trust'
  const verifyingSignUp =
    mode === 'sign-up' &&
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields.includes('email_address') &&
    signUp.missingFields.length === 0

  const switchMode = (next: Mode) => {
    setMode(next)
    setCode('')
    setFormError(null)
    void signIn.reset()
    void signUp.reset()
  }

  const finishSignIn = async () => {
    if (signIn.status !== 'complete') {
      if (signIn.status === 'needs_second_factor') {
        setFormError('This account needs another sign-in step that the app does not handle yet.')
        return
      }
      setFormError('Could not finish signing in.')
      return
    }

    const { error } = await signIn.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          setFormError('This account needs another step before the app can open.')
        }
      },
    })
    if (error) {
      setFormError(clerkErrorMessage(error, ['identifier', 'password', 'code'], 'Could not finish signing in.'))
    }
  }

  const submitPassword = async () => {
    setFormError(null)
    const trimmedEmail = emailAddress.trim()
    if (!trimmedEmail || !password) {
      setFormError('Enter your email and password.')
      return
    }

    try {
      if (mode === 'sign-in') {
        const { error } = await signIn.password({
          emailAddress: trimmedEmail,
          password,
        })
        if (error) {
          setFormError(
            clerkErrorMessage(error, ['identifier', 'password'], 'Could not sign in.'),
          )
          return
        }

        if (signIn.status === 'needs_client_trust') {
          const emailFactor = signIn.supportedSecondFactors?.find(
            (factor) => factor.strategy === 'email_code',
          )
          if (!emailFactor) {
            setFormError('This sign-in needs a verification step the app cannot send.')
            return
          }
          const { error: sendError } = await signIn.mfa.sendEmailCode()
          if (sendError) {
            setFormError(clerkErrorMessage(sendError, ['code'], 'Could not send a verification code.'))
          }
          return
        }

        await finishSignIn()
        return
      }

      const { error } = await signUp.password({
        emailAddress: trimmedEmail,
        password,
      })
      if (error) {
        setFormError(
          clerkErrorMessage(error, ['emailAddress', 'password'], 'Could not create an account.'),
        )
        return
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode()
      if (sendError) {
        setFormError(clerkErrorMessage(sendError, ['code', 'emailAddress'], 'Could not send a verification code.'))
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not sign in.')
    }
  }

  const submitCode = async () => {
    setFormError(null)
    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setFormError('Enter the verification code.')
      return
    }

    try {
      if (mode === 'sign-in') {
        const { error } = await signIn.mfa.verifyEmailCode({ code: trimmedCode })
        if (error) {
          setFormError(clerkErrorMessage(error, ['code'], 'That code did not work.'))
          return
        }
        await finishSignIn()
        return
      }

      const { error } = await signUp.verifications.verifyEmailCode({ code: trimmedCode })
      if (error) {
        setFormError(clerkErrorMessage(error, ['code'], 'That code did not work.'))
        return
      }

      if (signUp.status !== 'complete') {
        setFormError('Could not finish creating the account.')
        return
      }

      const { error: finalizeError } = await signUp.finalize()
      if (finalizeError) {
        setFormError(clerkErrorMessage(finalizeError, ['code'], 'Could not finish creating the account.'))
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'That code did not work.')
    }
  }

  const verifying = verifyingSignIn || verifyingSignUp

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.brand}>Good vs. Fun</Text>
          <Text style={styles.title}>{verifying ? 'Check your email' : mode === 'sign-in' ? 'Sign in' : 'Sign up'}</Text>
          <Text style={styles.subhead}>
            {verifying
              ? 'Enter the code Clerk sent so this device can use your existing account.'
              : 'Use the same email and password as the website.'}
          </Text>

          {formError ? <Text style={styles.error}>{formError}</Text> : null}

          {verifying ? (
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Verification code"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              style={styles.input}
            />
          ) : (
            <>
              <TextInput
                value={emailAddress}
                onChangeText={setEmailAddress}
                placeholder="Email"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                autoComplete="email"
                textContentType="username"
                style={styles.input}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={colors.muted}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                textContentType={mode === 'sign-in' ? 'password' : 'newPassword'}
                style={styles.input}
              />
            </>
          )}

          <Pressable
            style={[styles.primaryButton, busy && styles.disabled]}
            disabled={busy}
            onPress={verifying ? submitCode : submitPassword}
          >
            <Text style={styles.primaryLabel}>
              {busy ? 'Working…' : verifying ? 'Verify' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
            </Text>
          </Pressable>

          {mode === 'sign-up' ? <View nativeID="clerk-captcha" /> : null}

          <Pressable
            onPress={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            disabled={busy}
          >
            <Text style={styles.switchMode}>
              {mode === 'sign-in'
                ? 'Need an account? Sign up'
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
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
