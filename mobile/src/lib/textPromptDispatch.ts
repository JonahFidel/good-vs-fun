export type TextPromptHost = {
  show: (title: string, initialValue: string) => void
}

export function dispatchTextPrompt(
  os: string,
  title: string,
  initialValue: string,
  onSubmit: (value?: string) => void,
  iosAlert: (
    title: string,
    initialValue: string,
    onSubmit: (value?: string) => void,
  ) => void,
  host?: TextPromptHost,
) {
  if (os === 'ios') {
    iosAlert(title, initialValue, onSubmit)
    return
  }

  host?.show(title, initialValue)
}
