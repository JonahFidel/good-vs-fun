import assert from 'node:assert/strict'
import test from 'node:test'
import {
  ghostSelectionAfterPick,
  normalizeGhostSelection,
  swapGhostRoute,
} from './ghostCompare.ts'

test('normalizeGhostSelection ignores the open deck and a repeated second ghost', () => {
  assert.deepEqual(normalizeGhostSelection('primary', 'primary', 'other'), {
    ghostId: '',
    ghost2Id: 'other',
  })
  assert.deepEqual(normalizeGhostSelection('primary', 'ghost', 'ghost'), {
    ghostId: 'ghost',
    ghost2Id: '',
  })
  assert.deepEqual(normalizeGhostSelection('primary', 'ghost', 'primary'), {
    ghostId: 'ghost',
    ghost2Id: '',
  })
})

test('ghostSelectionAfterPick clears the other slot when both would show the same deck', () => {
  const current = { ghostId: 'comedy', ghost2Id: 'action' }
  assert.deepEqual(ghostSelectionAfterPick('primary', current, 1, 'action'), {
    ghostId: 'action',
    ghost2Id: '',
  })
  assert.deepEqual(ghostSelectionAfterPick('primary', current, 2, ''), {
    ghostId: 'comedy',
    ghost2Id: '',
  })
  assert.deepEqual(ghostSelectionAfterPick('primary', current, 1, 'primary'), {
    ghostId: '',
    ghost2Id: 'action',
  })
})

test('swapGhostRoute makes the chosen ghost the open deck and parks the old primary', () => {
  const current = { ghostId: 'comedy', ghost2Id: 'action' }
  assert.deepEqual(swapGhostRoute('primary', current, 1), {
    deckId: 'comedy',
    ghost: 'primary',
    ghost2: 'action',
  })
  assert.deepEqual(swapGhostRoute('primary', current, 2), {
    deckId: 'action',
    ghost: 'comedy',
    ghost2: 'primary',
  })
  assert.equal(swapGhostRoute('primary', { ghostId: '', ghost2Id: '' }, 1), null)
})
