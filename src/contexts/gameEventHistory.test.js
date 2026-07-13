import assert from 'node:assert/strict'
import test from 'node:test'

import { replayGameEvents } from './gameEventHistory.js'

test('replays buffered game events in receive order with timestamps', () => {
  const history = [
    { type: 'game:bullet_start', payload: { question: 'Q' }, receivedAt: 100, sequence: 1 },
    { type: 'game:bullet_hit', payload: { correct_count: 1 }, receivedAt: 200, sequence: 2 },
  ]
  const replayed = []

  replayGameEvents(history, (type, payload, metadata) => {
    replayed.push({ type, payload, metadata })
  })

  assert.deepEqual(replayed.map((event) => event.type), ['game:bullet_start', 'game:bullet_hit'])
  assert.equal(replayed[0].metadata.receivedAt, 100)
  assert.equal(replayed[1].metadata.sequence, 2)
  assert.equal(replayed[1].metadata.replayed, true)
})
