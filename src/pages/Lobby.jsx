import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LobbyHome } from '../components/lobby/LobbyHome'
import { JoinRoomModal } from '../components/lobby/JoinRoomModal'
import { useRoom } from '../hooks/useRoom'

// サーバーの拒否理由 → ユーザー向けメッセージ
const JOIN_ERROR_MESSAGES = {
  'room not found': 'ルームが見つかりません。ルームIDを確認してください',
  'game already in progress': 'このルームはゲーム中のため参加できません',
}

// ロビーホーム（/）。ルーム作成・コード入力での参加ができ、成功したら /room/:roomId へ遷移する。
export function Lobby() {
  const navigate = useNavigate()
  const { createRoom, joinByInvite, room, leaveRoom, roomNotice } = useRoom()
  const [isJoinOpen, setIsJoinOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ブラウザバック等で「ルームに接続したまま」ロビーへ戻った場合は切断する。
  // 残したままだと他メンバーには在室中に見え、次のルーム作成・参加時に
  // 旧接続が黙って閉じられて旧ルームが破棄（全員追い出し）されてしまう。
  // マウント時に残っていた接続だけが対象（ルーム作成直後の room 変化で
  // 新しい接続を切らないよう、room の変化には反応させない）。
  const cleanedUpStaleRoom = useRef(false)
  useEffect(() => {
    if (cleanedUpStaleRoom.current) return
    cleanedUpStaleRoom.current = true
    if (room) leaveRoom()
  }, [room, leaveRoom])

  async function runRoomAction(action) {
    setLoading(true)
    setError('')
    try {
      const roomId = await action()
      navigate(`/room/${roomId}`)
    } catch (err) {
      setError(JOIN_ERROR_MESSAGES[err?.message] ?? 'ルームに接続できませんでした')
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
        notice={roomNotice}
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
