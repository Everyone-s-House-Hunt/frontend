import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'

// 招待URL（/join/:inviteToken）の着地点。「URLクリックだけで参加」を実現するページ。
// ゲスト名を自動発行してWSでルームに参加し、成功したらルーム管理へ移動する。
export function JoinByInvite() {
  const { inviteToken } = useParams()
  const navigate = useNavigate()
  const { joinByInvite } = useRoom()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    joinByInvite({ inviteToken })
      .then((roomId) => {
        if (!cancelled) navigate(`/room/${roomId}`, { replace: true })
      })
      .catch(() => {
        if (!cancelled) setError('ルームに参加できませんでした。招待URLを確認してください。')
      })

    return () => {
      cancelled = true
    }
  }, [inviteToken, joinByInvite, navigate])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#170e3e] text-white">
      {error ? (
        <>
          <p className="text-2xl font-black">{error}</p>
          <Link to="/" className="text-lg font-bold underline">
            ロビーに戻る
          </Link>
        </>
      ) : (
        <p className="text-2xl font-black">ルームに参加しています...</p>
      )}
    </main>
  )
}
