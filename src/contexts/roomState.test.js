import assert from 'node:assert/strict'
import test from 'node:test'

import { derivePlayers, updateRoomPlayers } from './roomState.js'

test('derivePlayers orders the host first and remaining players by join sequence', () => {
  const players = [
    { player_id: 'guest-2', nickname: 'ゲスト2', is_host: false, join_seq: 2 },
    { player_id: 'host', nickname: 'ホスト', is_host: true, join_seq: 0 },
    { player_id: 'guest-1', nickname: 'ゲスト1', is_host: false, join_seq: 1 },
  ]

  const derived = derivePlayers(players)

  assert.deepEqual(
    derived.players.map((player) => player.player_id),
    ['host', 'guest-1', 'guest-2'],
  )
  assert.equal(derived.hostName, 'ホスト')
})

test('updateRoomPlayers applies host transfer to the current player', () => {
  const room = {
    roomId: '123456',
    playerId: 'guest-1',
    isHost: false,
    players: [],
  }
  const players = [
    { player_id: 'guest-2', nickname: 'ゲスト2', is_host: false, join_seq: 2 },
    { player_id: 'guest-1', nickname: 'ゲスト1', is_host: true, join_seq: 1 },
  ]

  const updated = updateRoomPlayers(room, players)

  assert.equal(updated.isHost, true)
  assert.equal(updated.hostName, 'ゲスト1')
  assert.deepEqual(
    updated.players.map((player) => player.player_id),
    ['guest-1', 'guest-2'],
  )
})
