import { useState, useEffect, useRef } from 'react'
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

// イノシシパニック本体。ルーム入室〜ゲーム開始はロビー側（RoomProvider）が済ませていて、
// この画面は /room/:roomId/game で activeGame.mode === 'boarPanic' のときに表示される。
export function Inosishi() {
  const navigate = useNavigate()
  const { room, clearActiveGame } = useRoom()
  const game = usePanicGame()

  // 動画ステージ:
  // 'idle'(round待ち) | 'approach'(出題+投票) | 'awaitResult'(動画終了・結果待ち)
  // | 'reveal'(得票数表示) | 'door' | 'wrong' | 'awaitRound'(次ラウンド待ち) | 'over' | 'complete'
  const [stage, setStage] = useState('idle')
  const lastPlayedRoundRef = useRef(0)

  const { src, token, visible, fadeMs, transitionTo, handleReady } = useVideoSequence(CLIPS.approach)

  // 全クリップを先読みして切り替え時のカクつきを防ぐ
  useEffect(() => {
    Object.values(CLIPS).forEach((url) => {
      const v = document.createElement('video')
      v.preload = 'auto'
      v.src = url
    })
  }, [])

  // ラウンド開始: 初回は即approach、2問目以降はdoor再生終了(awaitRound)と揃ったら
  useEffect(() => {
    if (!game.round) return
    if (game.round.round === lastPlayedRoundRef.current) return
    if (stage === 'idle') {
      lastPlayedRoundRef.current = game.round.round
      setStage('approach')
      return
    }
    if (stage === 'awaitRound') {
      lastPlayedRoundRef.current = game.round.round
      setStage('approach')
      transitionTo(CLIPS.approach)
    }
  }, [game.round, stage, transitionTo])

  // approach動画が終わって結果が届いたら得票数を見せる
  useEffect(() => {
    if (stage === 'awaitResult' && game.roundResult) {
      setStage('reveal')
    }
  }, [stage, game.roundResult])

  // 得票数を1.5秒見せてから扉/床抜けへ
  useEffect(() => {
    if (stage !== 'reveal') return
    const t = setTimeout(() => {
      const result = game.roundResult
      const counts = [
        result.votes && result.votes['0'] ? result.votes['0'].length : 0,
        result.votes && result.votes['1'] ? result.votes['1'].length : 0,
      ]
      if (result.result === 'tie') {
        // 同票（0対0含む）は扉を開けずにそのまま床抜け
        setStage('wrong')
        transitionTo(CLIPS.wrong)
        return
      }
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

  // 裏タブ対策: ブラウザは裏タブの動画・タイマーを止めるため、動画のended頼みの
  // 進行は裏で止まる。ゲームの正はサーバー状態なので、表に戻った瞬間に
  // 「本来いるべきステージ」まで一気に追いつく（途中の演出はスキップ）
  useEffect(() => {
    function resync() {
      if (document.visibilityState !== 'visible') return
      // 終了系が届いていたら最優先でそこへ
      if (game.gameClear && stage !== 'complete') {
        setStage('complete')
        return
      }
      if (game.gameOver && stage !== 'over') {
        setStage('over')
        return
      }
      if (!game.round) return
      // 裏にいる間に次のラウンドが始まっていた → そのapproachへ直行
      if (game.round.round !== lastPlayedRoundRef.current) {
        lastPlayedRoundRef.current = game.round.round
        setStage('approach')
        transitionTo(CLIPS.approach)
        return
      }
      // 同じラウンドで結果だけ先に届いていた → 残りの動画を待たず結果表示へ
      if (game.roundResult && (stage === 'approach' || stage === 'awaitResult')) {
        setStage('awaitResult') // revealエフェクトが拾って得票数→扉/床抜けに進む
      }
    }
    document.addEventListener('visibilitychange', resync)
    return () => document.removeEventListener('visibilitychange', resync)
  }, [game.round, game.roundResult, game.gameOver, game.gameClear, stage, transitionTo])

  // 動画が最後まで再生されるたびに次のステージへ
  function handleVideoEnded() {
    if (stage === 'approach') {
      // 動画(8秒)終了。結果はサーバーの10秒タイマー or 全員投票で届くまで最終フレームで待つ
      setStage('awaitResult')
      return
    }
    if (stage === 'door') {
      if (game.roundResult && game.roundResult.result === 'correct') {
        if (game.gameClear) {
          setStage('complete')
        } else {
          setStage('awaitRound') // 暗転フレームのまま次のround_startを待つ
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
      game.round && game.roundResult
        ? { text: game.round.question, correctAnswer: game.round.choices[game.roundResult.correct_index] }
        : null
    return (
      <GameOverScreen
        reason={over.reason === 'wrong_answer' ? 'option-miss' : 'timeout'}
        correctCount={Math.max(0, (over.final_round || 1) - 1)}
        totalCount={game.round ? game.round.total_rounds : 10}
        missedQuestion={missedQuestion}
        playerAnswer={game.myVote !== null && game.round ? game.round.choices[game.myVote] : null}
        onBackToRoom={handleBackToRoom}
      />
    )
  }

  if (!game.round || stage === 'idle') {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white text-2xl font-bold animate-pulse">
        まもなく開始…
      </div>
    )
  }

  const showPlates = stage === 'approach' || stage === 'awaitResult' || stage === 'reveal'
  const counts =
    stage === 'reveal' && game.roundResult
      ? [
          game.roundResult.votes && game.roundResult.votes['0'] ? game.roundResult.votes['0'].length : 0,
          game.roundResult.votes && game.roundResult.votes['1'] ? game.roundResult.votes['1'].length : 0,
        ]
      : null

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
          questionText={game.round.question}
          choices={game.round.choices}
          selectedIndex={game.myVote}
          onSelect={handleSelect}
          counts={counts}
          votedInfo={game.votedInfo}
        />
      )}
    </VideoStage>
  )
}
