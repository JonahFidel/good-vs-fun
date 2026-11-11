/**
 * Clerk defaults to ~13px fields. That loses to Safari's input auto-zoom
 * on iPhone, the same trap the 16px Add Movie / rename fields already
 * avoid. Appearance sets inline styles so Clerk's injected stylesheet
 * cannot shrink them again. UserButton size still comes from --nav-user-size.
 */
export const clerkAppearance = {
  variables: {
    fontSize: '16px',
  },
  elements: {
    rootBox: {
      width: '100%',
      maxWidth: '100%',
    },
    cardBox: {
      width: '100%',
      maxWidth: '100%',
    },
    card: {
      width: '100%',
      maxWidth: '100%',
    },
    formFieldInput: {
      fontSize: '16px',
      minHeight: '2.75rem',
    },
    otpCodeFieldInput: {
      fontSize: '16px',
      minHeight: '2.75rem',
    },
    formButtonPrimary: {
      minHeight: '2.75rem',
    },
    socialButtonsBlockButton: {
      minHeight: '2.75rem',
    },
    userButtonPopoverActionButton: {
      minHeight: '2.75rem',
    },
    userButtonTrigger: {
      width: 'var(--nav-user-size)',
      height: 'var(--nav-user-size)',
    },
    userButtonAvatarBox: {
      width: 'var(--nav-user-size)',
      height: 'var(--nav-user-size)',
    },
  },
} as const
