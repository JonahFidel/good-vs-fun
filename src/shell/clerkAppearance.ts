/**
 * Clerk defaults to ~13px fields. That loses to Safari's input auto-zoom
 * on iPhone, the same trap the 16px Add Movie / rename fields already
 * avoid. Appearance sets inline styles so Clerk's injected stylesheet
 * cannot shrink them again. UserButton size still comes from --nav-user-size.
 *
 * Card fill is Sign in/Sign up only. Global card/rootBox 100% also
 * stretches the UserButton popover (same `card` element) and the avatar
 * wrapper, so signed-in /decks account chrome overflows a 375px header.
 *
 * Manage account is a separate ~55rem modal. Cap it to the viewport so
 * a 375px iPhone can use it, keep 44px hits on its nav/actions, and let
 * Account/Security scroll inside that height instead of clipping.
 *
 * After email, Sign in still uses ~32px text links for edit-identifier,
 * resend, use-another-method, and Sign up. Those need the same 44px
 * padding-box as Continue, or the second step is harder to tap than the
 * first. Inline <a> tags ignore min-height unless they are flex.
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

const clerkUserProfileViewportMax =
  'min(55rem, calc(100vw - 1.5rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))'
const clerkUserProfileViewportHeight =
  'min(44rem, calc(100dvh - 1.5rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)))'

const clerkScrollBoxFit = {
  flex: '1 1 auto',
  minHeight: '0',
  overflowY: 'auto',
  WebkitOverflowScrolling: 'touch',
} as const

const clerk44pxTextHit = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: '2.75rem',
} as const

const clerkUserProfileFit = {
  modalContent: {
    width: '100%',
    maxWidth: clerkUserProfileViewportMax,
    height: clerkUserProfileViewportHeight,
    maxHeight: clerkUserProfileViewportHeight,
    margin: '0',
  },
  rootBox: {
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    minWidth: '0',
  },
  cardBox: {
    width: '100%',
    maxWidth: '100%',
    height: '100%',
    minWidth: '0',
  },
  card: {
    width: '100%',
    maxWidth: '100%',
    minWidth: '0',
    minHeight: '0',
    height: '100%',
    overflow: 'hidden',
  },
  scrollBox: clerkScrollBoxFit,
  pageScrollBox: clerkScrollBoxFit,
  navbarButton: {
    minHeight: '2.75rem',
  },
  navbarMobileMenuButton: {
    minHeight: '2.75rem',
  },
  navbarMobileMenuRow: {
    minHeight: '2.75rem',
  },
  profileSection: {
    minWidth: '0',
  },
  profileSectionContent: {
    minWidth: '0',
  },
  profileSectionItem: {
    minWidth: '0',
    minHeight: '2.75rem',
    overflowWrap: 'anywhere',
  },
  profileSectionPrimaryButton: {
    minHeight: '2.75rem',
  },
  accordionTriggerButton: {
    minHeight: '2.75rem',
  },
  formButtonReset: {
    minHeight: '2.75rem',
  },
  menuButton: {
    minWidth: '2.75rem',
    minHeight: '2.75rem',
  },
  menuItem: {
    minHeight: '2.75rem',
  },
  modalCloseButton: {
    minWidth: '2.75rem',
    minHeight: '2.75rem',
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
    formButtonReset: {
      minHeight: '2.75rem',
    },
    formFieldInputShowPasswordButton: {
      minWidth: '2.75rem',
      minHeight: '2.75rem',
    },
    socialButtonsBlockButton: {
      minHeight: '2.75rem',
    },
    socialButtonsIconButton: {
      minWidth: '2.75rem',
      minHeight: '2.75rem',
    },
    alternativeMethodsBlockButton: {
      minHeight: '2.75rem',
    },
    identityPreview: {
      minWidth: '0',
      maxWidth: '100%',
    },
    identityPreviewText: {
      minWidth: '0',
      overflowWrap: 'anywhere',
    },
    identityPreviewEditButton: {
      minWidth: '2.75rem',
      minHeight: '2.75rem',
    },
    footerActionLink: clerk44pxTextHit,
    formResendCodeLink: clerk44pxTextHit,
    formFieldAction: clerk44pxTextHit,
    headerBackLink: clerk44pxTextHit,
    backLink: clerk44pxTextHit,
    selectButton: {
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
  userProfile: {
    elements: clerkUserProfileFit,
  },
} as const
