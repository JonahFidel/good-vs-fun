/**
 * Clerk defaults to ~13px fields. That loses to Safari's input auto-zoom
 * on iPhone, the same trap the 16px Add Movie / rename fields already
 * avoid. Appearance sets inline styles so Clerk's injected stylesheet
 * cannot shrink them again. UserButton size still comes from --nav-user-size.
 *
 * Card fill is Sign in/Sign up only. Global card/rootBox 100% also
 * stretches the UserButton popover (same `card` element) and the avatar
 * wrapper, so signed-in /decks account chrome overflows a 375px header.
 */
const clerkAuthCardFill = {
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
} as const

export const clerkAppearance = {
  variables: {
    fontSize: '16px',
  },
  elements: {
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
  signIn: {
    elements: clerkAuthCardFill,
  },
  signUp: {
    elements: clerkAuthCardFill,
  },
  userButton: {
    elements: {
      rootBox: {
        width: 'auto',
        flexShrink: 0,
      },
      userButtonBox: {
        width: 'auto',
        flexShrink: 0,
      },
      userButtonPopoverRootBox: {
        width: 'auto',
        maxWidth: 'min(20rem, calc(100vw - 1.5rem))',
      },
      userButtonPopoverCard: {
        width: 'auto',
        maxWidth: 'min(20rem, calc(100vw - 1.5rem))',
      },
    },
  },
} as const
