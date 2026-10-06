import assert from 'node:assert/strict'
import test from 'node:test'
import { dispatchTextPrompt } from './textPromptDispatch.ts'

test('dispatchTextPrompt uses the iOS alert and ignores the in-app host', () => {
  const shown: Array<[string, string]> = []
  let submitted: string | undefined
  let alertTitle = ''
  let alertValue = ''

  dispatchTextPrompt(
    'ios',
    'Rename deck',
    'Comedy',
    (value) => {
      submitted = value
    },
    (title, initialValue, onSubmit) => {
      alertTitle = title
      alertValue = initialValue
      onSubmit('New Name')
    },
    {
      show: (title, initialValue) => {
        shown.push([title, initialValue])
      },
    },
  )

  assert.equal(alertTitle, 'Rename deck')
  assert.equal(alertValue, 'Comedy')
  assert.equal(submitted, 'New Name')
  assert.deepEqual(shown, [])
})

test('dispatchTextPrompt opens the in-app host on Android', () => {
  const shown: Array<[string, string]> = []
  let alertCalls = 0

  dispatchTextPrompt(
    'android',
    'Rename movie',
    'Heat',
    () => {
      throw new Error('Android should not submit through the iOS alert')
    },
    () => {
      alertCalls += 1
    },
    {
      show: (title, initialValue) => {
        shown.push([title, initialValue])
      },
    },
  )

  assert.equal(alertCalls, 0)
  assert.deepEqual(shown, [['Rename movie', 'Heat']])
})
