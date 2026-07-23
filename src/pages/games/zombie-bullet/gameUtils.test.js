import assert from 'node:assert/strict'
import test from 'node:test'

import { laneForPlayerIndex } from './gameUtils.js'

test('places one to five players evenly across five lanes', () => {
  const lanesByPlayerCount = Array.from({ length: 5 }, (_, countIndex) => {
    const playerCount = countIndex + 1
    return Array.from({ length: playerCount }, (_, playerIndex) =>
      laneForPlayerIndex(playerIndex, playerCount),
    )
  })

  assert.deepEqual(lanesByPlayerCount, [
    [0],
    [0, 4],
    [0, 2, 4],
    [0, 1, 3, 4],
    [0, 1, 2, 3, 4],
  ])
})

test('falls back to the host lane and clamps invalid player indexes', () => {
  assert.equal(laneForPlayerIndex(Number.NaN, 3), 0)
  assert.equal(laneForPlayerIndex(-1, 3), 0)
  assert.equal(laneForPlayerIndex(99, 3), 4)
  assert.equal(laneForPlayerIndex(0, 0), 0)
  assert.equal(laneForPlayerIndex(0, Number.NaN), 0)
})
