import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../../hooks/useRoom'
import { usePanicGame } from '../../hooks/usePanicGame'
import { useVideoSequence } from '../../hooks/useVideoSequence'
import { VideoStage } from '../../components/inosishi/VideoStage'
import { ChoicePlates } from '../../components/inosishi/ChoicePlates'
import { GameOverScreen } from '../../components/inosishi/GameOverScreen'
import { CompleteScreen } from '../../components/inosishi/CompleteScreen'

const CLIPS = {
  approach: '/videos/approach-friend.mp4',
  doorLeft: '/videos/door-open-left.mp4',
  doorRight: '/videos/door-open-right.mp4',
  wrong: '/videos/floor-wrong.mp4',
}

// ラウンド結果（得票数バッジ）を見せる時間
const REVEAL_MS = 1500

function countVotes(result) {
  return [
    result.votes && result.votes['0'] ? result.votes['0'].length : 0,
    result.votes && result.votes['1'] ? result.votes['1'].length : 0,
  ]
}

// イノシシパニック本体。ルーム入室〜ゲーム開始はロビー側（RoomProvider）が済ませていて、
// この画面は /room/:roomId/game で activeGame.mode === 'boarPanic' のときに表示される。
//
// 同期の設計:
// - サーバーは結果の3秒後に次ラウンドを送ってくるが、扉の演出(約5秒)は最後まで見せる
// - そのため「表示中のラウンド(displayRound)」をページ側に固定し、
//   次ラウンドのデータはdoor再生完了(awaitRound)まで採用しない（問題文の被り防止）
// - 結果も displayResult に固定する（usePanicGameの roundResult は次のround_startで
//   クリアされるため、直接参照するとdoor終了時の正誤判定がズレる）
// - 遅れは「結果受信から約2秒」の定数でラウンドごとにリセットされ、蓄積しない
export function Inosishi() {
  const navigate = useNavigate()
  const { room, clearActiveGame } = useRoom()
  const game = usePanicGame()

  // 動画ステージ:
  // 'idle'(round待ち) | 'approach'(出題+投票) | 'awaitResult'(動画終了・結果待ち)
  // | 'reveal'(得票数表示) | 'door' | 'wrong' | 'awaitRound'(次ラウンド待ち) | 'over' | 'complete'
  const [stage, setStage] = useState('idle')
  // いま画面に出しているラウンドとその結果（サーバーの最新値とは独立に固定する）
  const [displayRound, setDisplayRound] = useState(null)
  const [displayResult, setDisplayResult] = useState(null)

  const { src, token, visible, fadeMs, transitionTo, handleReady } = useVideoSequence(CLIPS.approach)

  // 全クリップを先読みして切り替え時のカクつきを防ぐ
  useEffect(() => {
    Object.values(CLIPS).forEach((url) => {
      const v = document.createElement('video')
      v.preload = 'auto'
      v.src = url
    })
  }, [])

  // ラウンド採用: 初回(idle) と door再生完了後(awaitRound) のみ。
  // 演出中に届いた次ラウンドはバッファされ、扉が開き終わってから採用される
  useEffect(() => {
    if (!game.round) return
    if (displayRound && game.round.round === displayRound.round) return
    if (stage !== 'idle' && stage !== 'awaitRound') return
    setDisplayRound(game.round)
    setDisplayResult(null)
    if (stage === 'idle') {
      setStage('approach')
      return
    }
    setStage('approach')
    transitionTo(CLIPS.approach)
  }, [game.round, stage, displayRound, transitionTo])

  // 表示中ラウンドの結果が届いたら固定する
  useEffect(() => {
    if (!game.roundResult || !displayRound) return
    if (game.roundResult.round !== displayRound.round) return
    setDisplayResult(game.roundResult)
  }, [game.roundResult, displayRound])

  // 結果が分かったら歩きの残りを待たずに得票数表示へ
  // （全員の投票が早い場合、動画終了前でもカットしてサーバーの進行に追従する）
  useEffect(() => {
    if ((stage === 'approach' || stage === 'awaitResult') && displayResult) {
      setStage('reveal')
    }
  }, [stage, displayResult])

  // 得票数を1.5秒見せてから扉/床抜けへ
  useEffect(() => {
    if (stage !== 'reveal') return
    const t = setTimeout(() => {
      if (displayResult.result === 'tie') {
        // 同票（0対0含む）は扉を開けずにそのまま床抜け
        setStage('wrong')
        transitionTo(CLIPS.wrong)
        return
      }
      const counts = countVotes(displayResult)
      const majority = counts[0] > counts[1] ? 0 : 1
      setStage('door')
      transitionTo(majority === 0 ? CLIPS.doorLeft : CLIPS.doorRight)
    }, REVEAL_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  // 最終問題クリア: door再生が先に終わっていてgame:clearが後から届いた場合
  useEffect(() => {
    if (stage === 'awaitRound' && game.gameClear) {
      setStage('complete')
    }
  }, [stage, game.gameClear])

  // 裏タブ対策: 表に戻った瞬間に「本来いるべきステージ」まで追いつく（演出スキップ）
  useEffect(() => {
    function resync() {
      if (document.visibilityState !== 'visible') return
      if (game.gameClear && stage !== 'complete') {
        setStage('complete')
        return
      }
      if (game.gameOver && stage !== 'over') {
        setStage('over')
        return
      }
      if (!game.round) return
      // 裏にいる間に次のラウンドが始まっていた → 演出を飛ばして新しいapproachへ直行
      if (!displayRound || game.round.round !== displayRound.round) {
        setDisplayRound(game.round)
        setDisplayResult(null)
        setStage('approach')
        transitionTo(CLIPS.approach)
      }
      // 同ラウンドで結果だけ届いていた場合は displayResult 経由のエフェクトが拾う
    }
    document.addEventListener('visibilitychange', resync)
    return () => document.removeEventListener('visibilitychange', resync)
  }, [game.round, game.gameOver, game.gameClear, stage, displayRound, transitionTo])

  // 動画が最後まで再生されるたびに次のステージへ
  function handleVideoEnded() {
    if (stage === 'approach') {
      // 動画(8秒)終了。結果が届くまで最終フレーム（扉の前）で待つ
      setStage('awaitResult')
      return
    }
    if (stage === 'door') {
      if (displayResult && displayResult.result === 'correct') {
        if (game.gameClear) {
          setStage('complete')
        } else {
          setStage('awaitRound') // 暗転フレームのまま。次ラウンドは採用エフェクトが拾う
        }
      } else {
        setStage('wrong')
        transitionTo(CLIPS.wrong)
      }
      return
    }
    if (stage === 'wrong') {
      setStage('over')
    }
  }

  function handleSelect(choiceIndex) {
    if (game.myVote !== null) return
    // 表示中のラウンドがサーバーの現在ラウンドである時だけ投票できる
    if (!game.round || !displayRound || game.round.round !== displayRound.round) return
    game.vote(choiceIndex)
  }

  // ゲーム状態だけ消してルーム管理画面へ戻る（WS接続・ルームは維持）
  function handleBackToRoom() {
    clearActiveGame()
    navigate(`/room/${room.roomId}`)
  }

  // ---- 画面の出し分け ----

  if (stage === 'complete') {
    return <CompleteScreen onBackToRoom={handleBackToRoom} />
  }

  if (stage === 'over') {
    const over = game.gameOver
    if (!over) {
      return <div className="h-screen bg-black" /> // game:over待ち（すぐ届く）
    }
    const missedQuestion =
      displayRound && displayResult
        ? { text: displayRound.question, correctAnswer: displayRound.choices[displayResult.correct_index] }
        : null
    return (
      <GameOverScreen
        reason={over.reason === 'wrong_answer' ? 'option-miss' : 'timeout'}
        correctCount={Math.max(0, (over.final_round || 1) - 1)}
        totalCount={displayRound ? displayRound.total_rounds : 10}
        missedQuestion={missedQuestion}
        playerAnswer={game.myVote !== null && displayRound ? displayRound.choices[game.myVote] : null}
        onBackToRoom={handleBackToRoom}
      />
    )
  }

  if (!displayRound || stage === 'idle') {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl font-bold animate-pulse">
        まもなく開始…
      </div>
    )
  }

  const showPlates = stage === 'approach' || stage === 'awaitResult' || stage === 'reveal'
  const counts = stage === 'reveal' && displayResult ? countVotes(displayResult) : null

  return (
    <VideoStage
      src={src}
      token={token}
      visible={visible}
      fadeMs={fadeMs}
      onReady={handleReady}
      onEnded={handleVideoEnded}
    >
      {showPlates && (
        <ChoicePlates
          questionText={displayRound.question}
          choices={displayRound.choices}
          selectedIndex={game.myVote}
          onSelect={handleSelect}
          counts={counts}
          votedInfo={game.votedInfo}
        />
      )}
    </VideoStage>
  )
}
