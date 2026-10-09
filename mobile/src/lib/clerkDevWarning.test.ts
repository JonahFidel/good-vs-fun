import assert from 'node:assert/strict'
import test from 'node:test'
import { clerkDevelopmentModeWarningProps } from './clerkDevWarning.ts'

test('disables the Clerk development-keys notice only in development', () => {
  assert.deepEqual(clerkDevelopmentModeWarningProps(true), {
    unsafe_disableDevelopmentModeConsoleWarning: true,
  })
  assert.deepEqual(clerkDevelopmentModeWarningProps(false), {
    unsafe_disableDevelopmentModeConsoleWarning: false,
  })
})
