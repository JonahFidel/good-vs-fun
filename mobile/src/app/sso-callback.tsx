import { Redirect } from 'expo-router'
import { SSO_CALLBACK_HOME } from '@/lib/ssoCallback'

export default function SsoCallbackScreen() {
  return <Redirect href={SSO_CALLBACK_HOME} />
}
