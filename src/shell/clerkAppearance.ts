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
 *
 * The verification-code row is six OTP boxes. The 44px / 0.7rem padding
 * that email fields need makes that row wider than a 375px leftover
 * (card padding plus #root inset). Keep 16px so Safari does not page-zoom,
 * keep 44px height, and let the boxes share the card width. minWidth 0
 * on the auth card is the same leak UserProfile needed: width 100% does
 * not beat Clerk's default min-width.
 *
 * Password fields overlay a reveal control on the input. Growing that
 * control to 44px without extra input padding puts the last characters
 * under the eye on Sign in, Sign up, and Manage account Security. Do
 * not put that padding on formFieldInput here: OTP segments also use
 * that slot, and 3rem sides would overflow a 375px leftover again.
 * CSS :has(.cl-formFieldInputShowPasswordButton) is the scoped path.
 *
 * The signed-in UserButton popover still has the min-width leak Sign in
 * and UserProfile already fixed. max-width alone loses to nowrap name
 * and email in userPreview: min-width: auto is the intrinsic address,
 * and that beats max-width, so a long email shoves Manage account off
 * a 375px leftover. minWidth 0 on the card plus overflow-wrap on the
 * identifiers is the same recipe as identity-preview and profile rows.
 */

const clerkAuthCardFill = {
  rootBox: {
    width: '100%',
    maxWidth: '100%',
    minWidth: '0',
  },
  cardBox: {
    width: '100%',
    maxWidth: '100%',
    minWidth: '0',
  },
  card: {
    width: '100%',
    maxWidth: '100%',
    minWidth: '0',
  },
} as const

const clerkOtpFieldFit = {
  width: '100%',
  maxWidth: '100%',
  minWidth: '0',
} as const

const clerkOtpInputFit = {
  fontSize: '16px',
  minHeight: '2.75rem',
  minWidth: '0',
  flex: '1 1 0',
  width: 'auto',
  aspectRatio: 'auto',
  padding: '0.35rem 0.15rem',
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

const clerkPreviewWrap = {
  minWidth: '0',
  maxWidth: '100%',
  overflowWrap: 'anywhere',
} as const

const clerkUserButtonPopoverMax =
  'min(20rem, calc(100vw - 1.5rem - env(safe-area-inset-left, 0px) - env(safe-area-inset-right, 0px)))'

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
    otpCodeField: clerkOtpFieldFit,
    otpCodeFieldInputs: {
      ...clerkOtpFieldFit,
      display: 'flex',
      gap: '0.25rem',
      justifyContent: 'space-between',
    },
    otpCodeFieldInputContainer: clerkOtpFieldFit,
    otpCodeFieldInput: clerkOtpInputFit,
    formButtonPrimary: {
      minHeight: '2.75rem',
    },
    formButtonReset: {
      minHeight: '2.75rem',
    },
    formFieldInputGroup: {
      position: 'relative',
      width: '100%',
      maxWidth: '100%',
      minWidth: '0',
    },
    formFieldInputShowPasswordButton: {
      position: 'absolute',
      top: '0',
      right: '0',
      minWidth: '2.75rem',
      minHeight: '2.75rem',
      height: '2.75rem',
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
    userPreview: clerkPreviewWrap,
    userPreviewTextContainer: clerkPreviewWrap,
    userPreviewMainIdentifier: clerkPreviewWrap,
    userPreviewMainIdentifierText: clerkPreviewWrap,
    userPreviewSecondaryIdentifier: clerkPreviewWrap,
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
        maxWidth: clerkUserButtonPopoverMax,
        minWidth: '0',
      },
      userButtonPopoverCard: {
        width: 'auto',
        maxWidth: clerkUserButtonPopoverMax,
        minWidth: '0',
      },
      userButtonPopoverMain: {
        minWidth: '0',
        maxWidth: '100%',
      },
    },
  },
  userProfile: {
    elements: clerkUserProfileFit,
  },
} as const
