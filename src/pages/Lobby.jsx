import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LobbyHome } from '../components/lobby/LobbyHome'
import { JoinRoomModal } from '../components/lobby/JoinRoomModal'
import { useRoom } from '../hooks/useRoom'

// ロビーホーム（/）。ルーム作成・コード入力での参加ができ、成功したら /room/:roomId へ遷移する。
export function Lobby() {
  const navigate = useNavigate()
  const { createRoom, joinByInvite } = useRoom()
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function runRoomAction(action) {
    setLoading(true)
    setError('')
    try {
      const roomId = await action()
      navigate(`/room/${roomId}`)
    } catch (err) {
      setError(
        err?.message === 'room not found'
          ? 'ルームが見つかりません。ルームIDを確認してください'
          : 'ルームに接続できませんでした',
      )
    } finally {
      setLoading(false)
    }
  }

  function handleCreateRoom() {
    runRoomAction(() => createRoom({ userName: 'ホスト' }))
  }

  // 参加ポップアップの入力はルームIDのみ。ニックネームは「メンバーN」を自動採番する
  // joinByInvite に乗せる（モック: 今は招待トークン＝ルームID）。
  function handleJoinRoom({ roomId }) {
    runRoomAction(() => joinByInvite({ inviteToken: roomId }))
  }

  return (
    <>
      <LobbyHome
        onCreateRoom={handleCreateRoom}
        onOpenJoin={() => {
          setError('')
          setIsJoinOpen(true)
        }}
        loading={loading}
        error={isJoinOpen ? '' : error}
      />

      {isJoinOpen && (
        <JoinRoomModal
          onClose={() => {
            if (!loading) setIsJoinOpen(false)
          }}
          onSubmit={handleJoinRoom}
          loading={loading}
          error={error}
        />
      )}
    </>
  )
}
