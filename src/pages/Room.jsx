import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { RoomManagement } from '../components/lobby/RoomManagement'
import { useRoom } from '../hooks/useRoom'

// ルーム管理ページ（/room/:roomId）。メンバー一覧・設定・ゲーム開始を行う。
export function Room() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const {
    room,
    settings,
    setSettings,
    startGame,
    leaveRoom,
    renameSelf,
    activeGame,
    serverError,
    roomEventNotice,
    confirmBackToLobby,
  } = useRoom()
  const [starting, setStarting] = useState(false)

  // ガード: 直リンク・リロード・ルーム破棄でルーム情報が無い場合はロビーへ戻す。
  // 将来は保存済みトークンでのWS再参加に置き換える。
  const hasRoom = room && room.roomId === roomId

  useEffect(() => {
    if (!hasRoom) navigate('/', { replace: true })
  }, [hasRoom, navigate])

  // このページが表示された = ロビー画面に戻った。サーバーへ通知し、
  // 全員が戻るまでホストの「ゲームスタート」を待たせる（初回入室時にも送るが無害）。
  useEffect(() => {
    if (hasRoom) confirmBackToLobby()
  }, [hasRoom, confirmBackToLobby])

  // ゲーム開始のブロードキャストを受けたら全員（ホストもゲストも）ゲーム画面へ
  useEffect(() => {
    if (hasRoom && activeGame) navigate(`/room/${roomId}/game`)
  }, [hasRoom, activeGame, roomId, navigate])

  // 開始要求中でも、サーバーに弾かれた（serverError が立った）らローディングを解く
  const loading = starting && !serverError

  if (!hasRoom) return null

  function handleStartGame() {
    setStarting(true)
    startGame() // 結果はWSで返る: 成功→activeGame が立つ / 失敗→serverError
  }

  // タイトルへ戻る = WSを切断してロビーへ。
  // 退出者だけ接続を閉じ、残った参加者は同じルームを維持する。
  function handleBackToTitle() {
    leaveRoom()
    navigate('/', { replace: true })
  }

  return (
    <RoomManagement
      room={room}
      settings={settings}
      onSettingsChange={setSettings}
      onStartGame={handleStartGame}
      onBackToTitle={handleBackToTitle}
      onRename={renameSelf}
      loading={loading}
      error={serverError}
      notice={roomEventNotice}
    />
  )
}
