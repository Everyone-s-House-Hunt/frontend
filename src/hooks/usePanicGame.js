import { useState, useEffect, useCallback } from 'react'
import { useRoom } from './useRoom'

// イノシシパニックのゲーム進行ロジック。
// WS接続はRoomProviderが1本持っているので、subscribeGame/sendGameMessage経由で使う。
// 最初の game:round_start はゲーム画面マウント前に届いて activeGame.startPayload に
// 入っているため、初期値としてそこから拾う。
export function usePanicGame() {
  const { activeGame, subscribeGame, sendGameMessage } = useRoom()

  const [round, setRound] = useState(() =>
    activeGame && activeGame.startType === 'game:round_start' ? activeGame.startPayload : null,
  )
  const [votedInfo, setVotedInfo] = useState(null) // { voted, total }
  const [myVote, setMyVote] = useState(null)       // 自分の choice_index
  const [roundResult, setRoundResult] = useState(null)
  const [gameOver, setGameOver] = useState(null)
  const [gameClear, setGameClear] = useState(null)

  useEffect(
    () =>
      subscribeGame((type, payload) => {
        switch (type) {
          case 'game:round_start':
            setRound(payload)
            setMyVote(null)
            setVotedInfo(null)
            setRoundResult(null)
            break
          case 'game:vote_received':
            setVotedInfo({ voted: payload.voted_count, total: payload.total_count })
            break
          case 'game:round_result':
            setRoundResult(payload)
            break
          case 'game:over':
            setGameOver(payload)
            break
          case 'game:clear':
            setGameClear(payload)
            break
          default:
            break
        }
      }),
    [subscribeGame],
  )

  const vote = useCallback(
    (choiceIndex) => {
      setMyVote(choiceIndex)
      sendGameMessage('game:vote', { choice_index: choiceIndex })
    },
    [sendGameMessage],
  )

  return { round, votedInfo, myVote, roundResult, gameOver, gameClear, vote }
}
