import assert from 'node:assert/strict'
import test from 'node:test'

import { RoomConnection } from './wsRoomClient.js'

test('send and sendGameStart report whether a WebSocket message was sent', () => {
  const originalWebSocket = globalThis.WebSocket
  globalThis.WebSocket = { OPEN: 1 }

  try {
    const sent = []
    const connection = new RoomConnection({})
    connection.current = {
      ws: {
        readyState: WebSocket.OPEN,
        send: (message) => sent.push(JSON.parse(message)),
      },
    }

    assert.equal(connection.send('game:bullet_submit', { answer: '東京' }), true)
    assert.equal(connection.sendGameStart('bullet'), true)
    assert.deepEqual(sent, [
      { type: 'game:bullet_submit', payload: { answer: '東京' } },
      { type: 'game:start', payload: { game_mode: 'bullet' } },
    ])

    connection.current.ws.readyState = 0
    assert.equal(connection.send('game:bullet_submit', { answer: '大阪' }), false)

    connection.current.ws.readyState = WebSocket.OPEN
    connection.current.ws.send = () => {
      throw new Error('socket closed')
    }
    assert.equal(connection.send('game:bullet_submit', { answer: '大阪' }), false)
  } finally {
    globalThis.WebSocket = originalWebSocket
  }
})

test('player leave updates the member list and game cancellation is forwarded', async () => {
  const originalWebSocket = globalThis.WebSocket
  const sockets = []

  class MockWebSocket {
    static OPEN = 1

    constructor() {
      this.readyState = MockWebSocket.OPEN
      this.sent = []
      sockets.push(this)
    }

    send(message) {
      this.sent.push(JSON.parse(message))
    }

    close() {
      this.readyState = 3
    }
  }

  globalThis.WebSocket = MockWebSocket

  try {
    const playerLeftEvents = []
    const gameMessages = []
    const connection = new RoomConnection({
      onPlayerLeft: (payload) => playerLeftEvents.push(payload),
      onGameMessage: (type, payload) => gameMessages.push({ type, payload }),
    })

    const joinedPromise = connection.join({
      roomId: '123456',
      nickname: 'ホスト',
      create: true,
    })
    const socket = sockets[0]
    socket.onopen()
    socket.onmessage({
      data: JSON.stringify({
        type: 'room:joined',
        payload: { player_id: 'host', is_host: true, players: [] },
      }),
    })
    await joinedPromise

    const remaining = [{ player_id: 'host', nickname: 'ホスト', is_host: true, join_seq: 0 }]
    socket.onmessage({
      data: JSON.stringify({
        type: 'room:player_left',
        payload: { player_id: 'guest', nickname: 'ゲスト', players: remaining },
      }),
    })
    socket.onmessage({
      data: JSON.stringify({
        type: 'game:cancelled',
        payload: { reason: 'player_disconnected', disconnected_player_id: 'guest' },
      }),
    })

    assert.deepEqual(playerLeftEvents, [
      {
        player_id: 'guest',
        nickname: 'ゲスト',
        players: remaining,
      },
    ])
    assert.deepEqual(gameMessages, [
      {
        type: 'game:cancelled',
        payload: { reason: 'player_disconnected', disconnected_player_id: 'guest' },
      },
    ])
  } finally {
    globalThis.WebSocket = originalWebSocket
  }
})
