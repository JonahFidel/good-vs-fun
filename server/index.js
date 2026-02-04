import { app, ensureSchema } from './app.js'
const port = process.env.PORT || 3001
ensureSchema()
  .then(() => {
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`API server listening on ${port}`)
    })
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize schema', error)
    process.exitCode = 1
  })
