import { getAuth } from '@clerk/express'

export const respondError = (res, status, message) => {
  res.status(status).json({ error: message })
}

export const asyncHandler =
  (handler) =>
  (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }

export const requireAuth = (req, res, next) => {
  const auth = getAuth(req)
  if (!auth?.userId) {
    return respondError(res, 401, 'Unauthorized.')
  }
  req.userId = auth.userId
  next()
}
