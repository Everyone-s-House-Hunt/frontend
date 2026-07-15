import { useEffect, useState } from 'react'
import { useRoom } from '../../hooks/useRoom'
import { WordPieceScreen } from '../../components/wordpiece/WordPieceScreen'

// コトバピースのゲームページ。
// バックエンドの WS メッセージ（ラウンド開始・入力進捗・結果・終了）を受け取って画面に流し込む。
export function WordPiece() {
  const { room, activeGame, subscribeGame, sendGameMessage, clearActiveGame } = useRoom()

  // 現在のラウンド。ゲーム開始を告げた最初の piece_round_start は activeGame に保持されている
  const [round, setRound] = useState(
    activeGame?.startType === 'game:piece_round_start' ? activeGame.startPayload : null,
  )
  const [progress, setProgress] = useState(null) // 入力進捗（人数のみ）
  const [result, setResult] = useState(null) // 直近ラウンドの結果
  const [ending, setEnding] = useState(null) // クリア / ゲームオーバー

  useEffect(
    () =>
      subscribeGame((type, payload) => {
        switch (type) {
          case 'game:piece_round_start': // 次ラウンド開始で結果・進捗をリセット
            setRound(payload)
            setProgress(null)
            setResult(null)
            break
          case 'game:piece_progress':
            setProgress(payload)
            break
          case 'game:piece_round_result':
            setResult(payload)
            break
          case 'game:over':
            // サーバーは round_result の直後に送ってくるので、
            // どのマスが間違えたかを見せてから終了画面を出す
            setTimeout(() => setEnding({ kind: 'over', ...payload }), 3000)
            break
          case 'game:clear':
            setEnding({ kind: 'clear', ...payload })
            break
        }
      }),
    [subscribeGame],
  )

  if (!round) return null

  // 自分の担当マス（slots の並び = position 順）。見つからなければ担当なし（-1）
  const myPlayerIndex = round.slots?.findIndex((s) => s.player_id === room?.playerId) ?? -1

  return (
    <WordPieceScreen
      key={round.round} // ラウンドが変わったら入力・タイマーをリセットする
      round={round}
      progress={progress}
      result={result}
      ending={ending}
      myPlayerIndex={myPlayerIndex}
      onSubmitChar={(char) => sendGameMessage('game:piece_submit', { char })}
      onLeave={clearActiveGame} // activeGame が消えると Game ページのガードがルームへ戻す
    />
  )
}
