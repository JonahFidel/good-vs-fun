import assert from 'node:assert/strict'
import test from 'node:test'
import { formattedMovieTitle } from './formatTitle.ts'

test('formattedMovieTitle title-cases a new name and ignores blanks or no-ops', () => {
  assert.equal(formattedMovieTitle('The Matrix', 'lord of the rings'), 'Lord of the Rings')
  assert.equal(formattedMovieTitle('The Matrix', '  '), null)
  assert.equal(formattedMovieTitle('The Matrix', undefined), null)
  assert.equal(formattedMovieTitle('The Matrix', 'the matrix'), null)
})
