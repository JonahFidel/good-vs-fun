export function clerkErrorMessage(
  error: { longMessage?: string; message?: string } | null | undefined,
  fallback: string,
) {
  return error?.longMessage || error?.message || fallback
}
