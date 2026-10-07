import assert from 'node:assert/strict'
import test from 'node:test'
import {
  SSO_CALLBACK_HOME,
  SSO_CALLBACK_PATH,
  googleSsoStartParams,
} from './ssoCallback.ts'

test('google SSO params keep Clerk on the sso-callback path', () => {
  const redirectUrl = 'exp://10.0.2.2:8081/--/sso-callback'
  const params = googleSsoStartParams(redirectUrl)

  assert.equal(params.strategy, 'oauth_google')
  assert.equal(params.oidcPrompt, 'select_account')
  assert.equal(params.redirectUrl, redirectUrl)
  assert.equal(params.redirectUrl.endsWith(SSO_CALLBACK_PATH), true)
  assert.equal(params.authSessionOptions.preferEphemeralSession, true)
})

test('SSO callback home is the app index, not a logged callback URL', () => {
  assert.equal(SSO_CALLBACK_HOME, '/')
  assert.equal(SSO_CALLBACK_PATH.startsWith('/'), true)
  assert.equal(SSO_CALLBACK_PATH.includes('?'), false)
})
