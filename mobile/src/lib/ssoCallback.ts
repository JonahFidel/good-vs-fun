export const SSO_CALLBACK_PATH = '/sso-callback'
export const SSO_CALLBACK_HOME = '/'

export function googleSsoStartParams(redirectUrl: string) {
  return {
    strategy: 'oauth_google' as const,
    oidcPrompt: 'select_account',
    redirectUrl,
    // A shared browser session asks the simulator to unlock saved
    // passwords, which this phone cannot answer.
    authSessionOptions: {
      preferEphemeralSession: true,
    } as { showInRecents?: boolean },
  }
}
