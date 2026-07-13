import assert from 'node:assert/strict'
import test from 'node:test'

import { createBulletGame, reduceBulletGame, remainingBulletTime } from './zombieBulletState.js'

const startPayload = {
  question: '10個答えろ',
  target_hits: 10,
  time_limit_sec: 60,
  current_player_id: 'host',
  players: [
    { position: 1, player_id: 'guest', nickname: 'ゲスト' },
    { position: 0, player_id: 'host', nickname: 'ホスト' },
  ],
}

test('creates server-authoritative start state and restores elapsed time', () => {
  const game = createBulletGame(startPayload, 1_000)
  assert.equal(game.targetHits, 10)
  assert.deepEqual(game.players.map((player) => player.player_id), ['host', 'guest'])
  assert.equal(remainingBulletTime(game, 6_000), 55_000)
})

test('hit advances the turn and preserves server answer order', () => {
  const game = reduceBulletGame(createBulletGame(startPayload, 1_000), {
    type: 'game:bullet_hit',
    receivedAt: 2_000,
    payload: {
      player_id: 'host',
      answer: '東京',
      correct_count: 2,
      target_hits: 10,
      current_player_id: 'guest',
      used: ['大阪', '東京'],
    },
  })
  assert.equal(game.currentPlayerId, 'guest')
  assert.deepEqual(game.used, ['大阪', '東京'])
  assert.equal(game.feedback.kind, 'correct')
})

test('wrong and duplicate answers keep the server-selected turn', () => {
  const initial = createBulletGame(startPayload, 1_000)
  const wrong = reduceBulletGame(initial, {
    type: 'game:bullet_miss',
    payload: { player_id: 'host', reason: 'wrong', current_player_id: 'host' },
  })
  const duplicate = reduceBulletGame(wrong, {
    type: 'game:bullet_miss',
    payload: { player_id: 'host', reason: 'duplicate', current_player_id: 'host' },
  })
  assert.equal(wrong.currentPlayerId, 'host')
  assert.equal(wrong.feedback.kind, 'incorrect')
  assert.equal(duplicate.currentPlayerId, 'host')
  assert.equal(duplicate.feedback.kind, 'duplicate')
})

test('clear and timeout are driven only by server terminal events', () => {
  const initial = createBulletGame(startPayload, 1_000)
  assert.equal(remainingBulletTime(initial, 70_000), 0)
  assert.equal(initial.phase, 'playing')
  assert.equal(reduceBulletGame(initial, { type: 'game:clear', payload: {} }).phase, 'win')
  assert.equal(
    reduceBulletGame(initial, { type: 'game:over', payload: { final_round: 4 } }).phase,
    'lose',
  )
})

test('replaying the same history rebuilds the same final state', () => {
  const history = [
    { type: 'game:bullet_start', payload: startPayload, receivedAt: 1_000 },
    {
      type: 'game:bullet_hit',
      payload: {
        correct_count: 1,
        target_hits: 10,
        current_player_id: 'guest',
        used: ['東京'],
      },
      receivedAt: 2_000,
    },
  ]
  const rebuilt = history.reduce(reduceBulletGame, createBulletGame({}, 0))
  assert.equal(rebuilt.correctCount, 1)
  assert.equal(rebuilt.currentPlayerId, 'guest')
  assert.deepEqual(rebuilt.used, ['東京'])
})
