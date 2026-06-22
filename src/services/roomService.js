const ROOM_ID_LENGTH = 10

function delay(ms = 250) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function generateRoomId() {
  return String(Math.floor(Math.random() * 10 ** ROOM_ID_LENGTH)).padStart(ROOM_ID_LENGTH, '0')
}

export async function createRoom({ userName }) {
  await delay()
  const hostName = userName || 'ホスト'

  return {
    roomId: generateRoomId(),
    hostName,
    members: [hostName],
  }
}

export async function joinRoom({ roomId, userName }) {
  await delay()

  return {
    roomId,
    hostName: 'りんりんご',
    members: ['りんりんご', userName],
  }
}

export async function startRoomGame({ roomId, gameMode, questionSource }) {
  await delay(180)

  return {
    ok: Boolean(roomId && gameMode && questionSource),
  }
}
