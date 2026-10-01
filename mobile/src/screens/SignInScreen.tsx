import { useSignIn, useSignUp } from '@clerk/expo'
import { useSSO } from '@clerk/expo/experimental'
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
import { clerkErrorMessage, clerkThrownMessage } from '@/lib/clerkErrors'
import { colors, radii } from '@/theme'

type Mode = 'sign-in' | 'sign-up'
type Step = 'credentials' | 'code' | 'trust'

export function SignInScreen() {
  const { signIn, fetchStatus: signInStatus } = useSignIn()
  const { signUp, fetchStatus: signUpStatus } = useSignUp()
  const { startSSOFlow } = useSSO()
  const [mode, setMode] = useState<Mode>('sign-in')
  const [step, setStep] = useState<Step>('credentials')
  const [emailAddress, setEmailAddress] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [googleBusy, setGoogleBusy] = useState(false)

  const busy = signInStatus === 'fetching' || signUpStatus === 'fetching' || googleBusy

  const switchMode = (next: Mode) => {
    setMode(next)
    setStep('credentials')
    setCode('')
    setFormError(null)
    void signIn.reset()
    void signUp.reset()
  }

  const finishSignIn = async () => {
    if (signIn.status !== 'complete') {
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
      setFormError(clerkErrorMessage(error, 'Could not finish signing in.'))
    }
  }

  const signInWithGoogle = async () => {
    setFormError(null)
    setGoogleBusy(true)
    try {
      const { createdSessionId, authSessionResult } = await startSSOFlow({
        strategy: 'oauth_google',
      })
      const sessionType = authSessionResult?.type
      if (sessionType === 'cancel' || sessionType === 'dismiss') {
        return
      }
      if (createdSessionId) {
        return
      }
      if (signIn.status === 'needs_client_trust') {
        const { error: sendError } = await signIn.mfa.sendEmailCode()
        if (sendError) {
          setFormError(clerkErrorMessage(sendError, 'Could not send a verification code.'))
          return
        }
        setCode('')
        setStep('trust')
        return
      }
      setFormError('Could not finish signing in with Google.')
    } catch (error) {
      setFormError(clerkThrownMessage(error, 'Could not sign in with Google.'))
    } finally {
      setGoogleBusy(false)
    }
  }

  const submitCredentials = async () => {
    setFormError(null)
    const trimmedEmail = emailAddress.trim()
    if (!trimmedEmail) {
      setFormError('Enter your email.')
      return
    }

    try {
      if (mode === 'sign-in') {
        const { error } = await signIn.emailCode.sendCode({ emailAddress: trimmedEmail })
        if (error) {
          setFormError(clerkErrorMessage(error, 'Could not send a sign-in code.'))
          return
        }
        setCode('')
        setStep('code')
        return
      }

      if (!password) {
        setFormError('Enter a password.')
        return
      }

      const { error } = await signUp.password({
        emailAddress: trimmedEmail,
        password,
      })
      if (error) {
        setFormError(clerkErrorMessage(error, 'Could not create an account.'))
        return
      }

      const { error: sendError } = await signUp.verifications.sendEmailCode()
      if (sendError) {
        setFormError(clerkErrorMessage(sendError, 'Could not send a verification code.'))
        return
      }
      setCode('')
      setStep('code')
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Could not continue.')
    }
  }

  const submitCode = async () => {
    setFormError(null)
    const trimmedCode = code.trim()
    if (!trimmedCode) {
      setFormError('Enter the code from your email.')
      return
    }

    try {
      if (mode === 'sign-in') {
        const { error } =
          step === 'trust'
            ? await signIn.mfa.verifyEmailCode({ code: trimmedCode })
            : await signIn.emailCode.verifyCode({ code: trimmedCode })
        if (error) {
          setFormError(clerkErrorMessage(error, 'That code did not work.'))
          return
        }

        if (signIn.status === 'needs_client_trust') {
          const { error: sendError } = await signIn.mfa.sendEmailCode()
          if (sendError) {
            setFormError(clerkErrorMessage(sendError, 'Could not send a verification code.'))
            return
          }
          setCode('')
          setStep('trust')
          return
        }

        await finishSignIn()
        return
      }

      const { error } = await signUp.verifications.verifyEmailCode({ code: trimmedCode })
      if (error) {
        setFormError(clerkErrorMessage(error, 'That code did not work.'))
        return
      }

      if (signUp.status !== 'complete') {
        setFormError('Could not finish creating the account.')
        return
      }

      const { error: finalizeError } = await signUp.finalize()
      if (finalizeError) {
        setFormError(clerkErrorMessage(finalizeError, 'Could not finish creating the account.'))
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'That code did not work.')
    }
  }

  const title =
    step === 'trust' ? 'Confirm this device' : step === 'code' ? 'Check your email' : mode === 'sign-in' ? 'Sign in' : 'Sign up'
  const subhead =
    step === 'trust'
      ? 'Clerk needs one more code before this phone can use your account.'
      : step === 'code'
        ? `Enter the code sent to ${emailAddress.trim()}.`
        : mode === 'sign-in'
          ? 'Use the same account as the website. The code is entered here in the app.'
          : 'Create the same kind of account the website uses.'

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.brand}>Good vs. Fun</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subhead}>{subhead}</Text>

          {formError ? <Text style={styles.error}>{formError}</Text> : null}

          {step === 'credentials' && mode === 'sign-in' ? (
            <>
              <Pressable
                style={[styles.googleButton, busy && styles.disabled]}
                disabled={busy}
                onPress={() => {
                  void signInWithGoogle()
                }}
              >
                <Text style={styles.googleLabel}>
                  {googleBusy ? 'Working…' : 'Log in with Google'}
                </Text>
              </Pressable>
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>or</Text>
                <View style={styles.orLine} />
              </View>
            </>
          ) : null}

          {step === 'credentials' ? (
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
              {mode === 'sign-up' ? (
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={colors.muted}
                  secureTextEntry
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  style={styles.input}
                />
              ) : null}
            </>
          ) : (
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Email code"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              style={styles.input}
            />
          )}

          <Pressable
            style={[styles.primaryButton, busy && styles.disabled]}
            disabled={busy}
            onPress={step === 'credentials' ? submitCredentials : submitCode}
          >
            <Text style={styles.primaryLabel}>
              {busy
                ? 'Working…'
                : step === 'credentials'
                  ? mode === 'sign-in'
                    ? 'Email me a code'
                    : 'Create account'
                  : 'Continue'}
            </Text>
          </Pressable>

          {mode === 'sign-up' && step === 'credentials' ? <View nativeID="clerk-captcha" /> : null}

          {step === 'credentials' ? (
            <Pressable onPress={() => switchMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} disabled={busy}>
              <Text style={styles.switchMode}>
                {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                setStep('credentials')
                setCode('')
                setFormError(null)
              }}
              disabled={busy}
            >
              <Text style={styles.switchMode}>Use a different email</Text>
            </Pressable>
          )}
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
  googleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  googleLabel: {
    color: colors.heading,
    fontSize: 16,
    fontWeight: '700',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  switchMode: {
    textAlign: 'center',
    color: colors.heading,
    fontWeight: '700',
  },
})
