import { Alert, Platform } from 'react-native'
import { dispatchTextPrompt, type TextPromptHost } from './textPromptDispatch'

export type { TextPromptHost }

/**
 * React Native's Alert.prompt is iOS-only. On Android it is a documented
 * no-op, so rename has to use an in-app field instead.
 */
export function requestTextPrompt(
  title: string,
  initialValue: string,
  onSubmit: (value?: string) => void,
  host?: TextPromptHost,
) {
  dispatchTextPrompt(
    Platform.OS,
    title,
    initialValue,
    onSubmit,
    (promptTitle, promptValue, submit) => {
      Alert.prompt(
        promptTitle,
        undefined,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Save',
            onPress: (value?: string) => {
              submit(value)
            },
          },
        ],
        'plain-text',
        promptValue,
      )
    },
    host,
  )
}
