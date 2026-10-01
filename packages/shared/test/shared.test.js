import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ApiRoute,
  deckMoviePath,
  deckMoviesPath,
  deckPath,
  formatScore,
  formatTitle,
  snapScoreToStep,
} from '../dist/index.js'

test('snapScoreToStep rounds to the score step and clamps to 0-10', () => {
  assert.equal(snapScoreToStep(7.226), 7.23)
  assert.equal(snapScoreToStep(10.4), 10)
  assert.equal(snapScoreToStep(-1), 0)
})

test('formatTitle capitalizes words and keeps interior small words lower', () => {
  assert.equal(formatTitle('lord of the rings'), 'Lord of the Rings')
  assert.equal(formatTitle('  the matrix  '), 'The Matrix')
  assert.equal(formatTitle('a'), 'A')
  assert.equal(formatTitle('the lord of the rings'), 'The Lord of the Rings')
  assert.equal(formatTitle(''), '')
})

test('formatScore keeps up to two decimal places', () => {
  assert.equal(formatScore(7), '7')
  assert.equal(formatScore(7.5), '7.5')
  assert.equal(formatScore(7.22), '7.22')
})

test('client paths match the express route patterns', () => {
  assert.equal(deckPath('deck-1'), '/api/decks/deck-1')
  assert.equal(ApiRoute.deck.replace(':deckId', 'deck-1'), deckPath('deck-1'))
  assert.equal(deckMoviesPath('deck-1'), '/api/decks/deck-1/movies')
  assert.equal(
    ApiRoute.deckMovies.replace(':deckId', 'deck-1'),
    deckMoviesPath('deck-1'),
  )
  assert.equal(
    deckMoviePath('deck-1', 'movie-1'),
    '/api/decks/deck-1/movies/movie-1',
  )
  assert.equal(
    ApiRoute.deckMovie.replace(':deckId', 'deck-1').replace(':movieId', 'movie-1'),
    deckMoviePath('deck-1', 'movie-1'),
  )
  assert.equal(ApiRoute.health, '/api/health')
  assert.equal(ApiRoute.decks, '/api/decks')
})
