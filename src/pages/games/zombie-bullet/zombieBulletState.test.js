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

test('hit advances the turn and appends answers in event-received order', () => {
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
  assert.deepEqual(game.used, ['東京'])
  assert.equal(game.feedback.kind, 'correct')
})

test('ten hit events fill slots left-to-right without trusting the server used map', () => {
  const answers = Array.from({ length: 10 }, (_, index) => `回答${index + 1}`)
  const game = answers.reduce(
    (state, answer, index) =>
      reduceBulletGame(state, {
        type: 'game:bullet_hit',
        receivedAt: 2_000 + index,
        payload: {
          answer,
          correct_count: index + 1,
          current_player_id: index % 2 === 0 ? 'guest' : 'host',
          used: [...answers].reverse(),
        },
      }),
    createBulletGame(startPayload, 1_000),
  )

  assert.equal(game.correctCount, 10)
  assert.deepEqual(game.used, answers)
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

test('duplicate delivery does not add the same accepted answer twice', () => {
  const hit = {
    type: 'game:bullet_hit',
    payload: {
      answer: '東京',
      correct_count: 1,
      target_hits: 10,
      current_player_id: 'guest',
    },
    receivedAt: 2_000,
  }
  const once = reduceBulletGame(createBulletGame(startPayload, 1_000), hit)
  const twice = reduceBulletGame(once, hit)
  assert.deepEqual(twice.used, ['東京'])
})

test('player leave updates roster and turn without resetting progress or timer', () => {
  const progressed = reduceBulletGame(createBulletGame(startPayload, 1_000), {
    type: 'game:bullet_hit',
    payload: {
      player_id: 'host',
      answer: '東京',
      correct_count: 1,
      current_player_id: 'guest',
    },
    receivedAt: 2_000,
  })

  const continued = reduceBulletGame(progressed, {
    type: 'game:player_left',
    payload: {
      disconnected_player_id: 'guest',
      disconnected_nickname: 'ゲスト',
      players: [{ player_id: 'host', nickname: 'ホスト', join_seq: 0 }],
      current_player_id: 'host',
      total_count: 1,
      voted_count: 0,
    },
    receivedAt: 3_000,
  })

  assert.deepEqual(continued.players.map((player) => player.player_id), ['host'])
  assert.equal(continued.currentPlayerId, 'host')
  assert.equal(continued.correctCount, 1)
  assert.deepEqual(continued.used, ['東京'])
  assert.equal(continued.startedAt, 1_000)
  assert.equal(continued.phase, 'playing')
  assert.equal(continued.feedback.kind, 'player_left')
  assert.equal(continued.feedback.nickname, 'ゲスト')
})

test('late hit and miss events cannot restore a departed current player', () => {
  const continued = reduceBulletGame(createBulletGame(startPayload, 1_000), {
    type: 'game:player_left',
    payload: {
      disconnected_player_id: 'guest',
      players: [{ player_id: 'host', nickname: 'ホスト', join_seq: 0 }],
      current_player_id: 'host',
    },
  })

  const lateHit = reduceBulletGame(continued, {
    type: 'game:bullet_hit',
    payload: {
      player_id: 'guest',
      answer: '東京',
      correct_count: 1,
      current_player_id: 'guest',
    },
  })
  const lateMiss = reduceBulletGame(lateHit, {
    type: 'game:bullet_miss',
    payload: {
      player_id: 'guest',
      reason: 'wrong',
      current_player_id: 'guest',
    },
  })

  assert.equal(lateHit.currentPlayerId, 'host')
  assert.equal(lateMiss.currentPlayerId, 'host')
})
