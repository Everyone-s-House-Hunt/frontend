import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { Mansion } from './games/Mansion'
import { WordPiece } from './games/WordPiece'
import ZombieBullet from './games/zombie-bullet/ZombieBullet'

// ゲームページ（/room/:roomId/game）。WSで通知されたゲームモードに応じて画面を出し分ける。
export function Game() {
  const { roomId } = useParams()
  const navigate = useNavigate()
  const { room, activeGame } = useRoom()

  // ガード: ルーム情報が無ければロビーへ、ゲーム未開始ならルーム管理へ戻す。
  const hasRoom = room && room.roomId === roomId

  useEffect(() => {
    if (!hasRoom) {
      navigate('/', { replace: true })
    } else if (!activeGame) {
      navigate(`/room/${roomId}`, { replace: true })
    }
  }, [hasRoom, activeGame, roomId, navigate])

  if (!hasRoom || !activeGame) return null

  if (activeGame.mode === 'wordPiece') {
    return <WordPiece />
  }
  if (activeGame.mode === 'zombieBullet') {
    return <ZombieBullet />
  }
  return <Mansion />
}
