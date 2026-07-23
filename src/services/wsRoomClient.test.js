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
