import { useState } from 'react'
import { LobbyHome } from '../components/lobby/LobbyHome'
import { JoinRoomModal } from '../components/lobby/JoinRoomModal'
import { RoomManagement } from '../components/lobby/RoomManagement'
import { Mansion } from './games/Mansion'
import { createRoom, joinRoom, startRoomGame } from '../services/roomService'

const INITIAL_SETTINGS = {
  gameMode: 'zombieBullet',
  questionSource: 'random',
}

export function Lobby() {
  const [view, setView] = useState('home')
  const [room, setRoom] = useState(null)
  const [settings, setSettings] = useState(INITIAL_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function runRoomAction(action) {
    setLoading(true)
    setError('')
    try {
      const nextRoom = await action()
      setRoom(nextRoom)
      setView('roomManagement')
    } catch {
      setError('ルーム情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  function handleCreateRoom() {
    runRoomAction(() => createRoom({ userName: 'ホスト' }))
  }

  function handleJoinRoom(payload) {
    runRoomAction(() => joinRoom(payload))
  }

  async function handleStartGame() {
    if (!room) return

    setLoading(true)
    setError('')
    try {
      const result = await startRoomGame({
        roomId: room.roomId,
        gameMode: settings.gameMode,
        questionSource: settings.questionSource,
      })

      if (!result.ok) {
        setError('ゲームを開始できませんでした')
        return
      }

      setView('game')
    } catch {
      setError('ゲームを開始できませんでした')
    } finally {
      setLoading(false)
    }
  }

  if (view === 'game') {
    return <Mansion />
  }

  return (
    <>
      {view === 'roomManagement' && room ? (
        <RoomManagement
          room={room}
          settings={settings}
          onSettingsChange={setSettings}
          onStartGame={handleStartGame}
          loading={loading}
          error={error}
        />
      ) : (
        <LobbyHome
          onCreateRoom={handleCreateRoom}
          onOpenJoin={() => {
            setError('')
            setView('joinRoom')
          }}
          loading={loading}
        />
      )}

      {view === 'joinRoom' && (
        <JoinRoomModal
          onClose={() => {
            if (!loading) setView('home')
          }}
          onSubmit={handleJoinRoom}
          loading={loading}
          error={error}
        />
      )}
    </>
  )
}
