import { useAuth } from '@clerk/expo'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { DecksScreen } from '@/screens/DecksScreen'
import { SignInScreen } from '@/screens/SignInScreen'
import { colors } from '@/theme'

export default function HomeScreen() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.heading} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    )
  }

  if (!isSignedIn) {
    return <SignInScreen />
  }

  return <DecksScreen />
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
  },
})
