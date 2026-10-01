/** Express route patterns registered by the API. */
export const ApiRoute = {
  health: '/api/health',
  adminInit: '/api/admin/init',
  decks: '/api/decks',
  deck: '/api/decks/:deckId',
  deckMovies: '/api/decks/:deckId/movies',
  deckMovie: '/api/decks/:deckId/movies/:movieId',
} as const

export const deckPath = (deckId: string) => `/api/decks/${deckId}`

export const deckMoviesPath = (deckId: string) => `${deckPath(deckId)}/movies`

export const deckMoviePath = (deckId: string, movieId: string) =>
  `${deckMoviesPath(deckId)}/${movieId}`
