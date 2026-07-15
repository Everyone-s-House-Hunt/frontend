import { useState, useEffect, useRef } from 'react'
import { usePanicSocket } from '../../hooks/usePanicSocket'
import { useVideoSequence } from '../../hooks/useVideoSequence'
import { LoadingScreen } from '../../components/inosishi/LoadingScreen'
import { RoomEntry } from '../../components/inosishi/RoomEntry'
import { RoomLobby } from '../../components/inosishi/RoomLobby'
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

// ラウンド結果を見せる時間（プレート上の人数バッジ表示）
const REVEAL_MS = 1500

export function Inosishi() {
  const [isLoading, setIsLoading] = useState(true)
  // 動画ステージ:
  // 'idle'(初回round待ち) | 'approach'(出題+投票) | 'awaitResult'(動画終了・結果待ち)
  // | 'reveal'(得票数表示) | 'door' | 'wrong' | 'awaitRound'(次ラウンド待ち) | 'over' | 'complete'
  const [stage, setStage] = useState('idle')
  const lastPlayedRoundRef = useRef(0)

  const sock = usePanicSocket()
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
    if (!sock.round) return
    if (sock.round.round === lastPlayedRoundRef.current) return
    if (stage === 'idle') {
      lastPlayedRoundRef.current = sock.round.round
      setStage('approach')
      return
    }
    if (stage === 'awaitRound') {
      lastPlayedRoundRef.current = sock.round.round
      setStage('approach')
      transitionTo(CLIPS.approach)
    }
  }, [sock.round, stage, transitionTo])

  // approach動画が終わって結果が届いたら得票数を見せる
  useEffect(() => {
    if (stage === 'awaitResult' && sock.roundResult) {
      setStage('reveal')
    }
  }, [stage, sock.roundResult])

  // 得票数を1.5秒見せてから扉/床抜けへ
  useEffect(() => {
    if (stage !== 'reveal') return
    const t = setTimeout(() => {
      const result = sock.roundResult
      const counts = [
        (result.votes && result.votes['0'] ? result.votes['0'].length : 0),
        (result.votes && result.votes['1'] ? result.votes['1'].length : 0),
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
    if (stage === 'awaitRound' && sock.gameClear) {
      setStage('complete')
    }
  }, [stage, sock.gameClear])

  // 動画が最後まで再生されるたびに次のステージへ
  function handleVideoEnded() {
    if (stage === 'approach') {
      // 動画(8秒)終了。結果はサーバーの10秒タイマー or 全員投票で届くまで最終フレームで待つ
      setStage('awaitResult')
      return
    }
    if (stage === 'door') {
      if (sock.roundResult && sock.roundResult.result === 'correct') {
        if (sock.gameClear) {
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
    if (sock.myVote !== null) return
    sock.vote(choiceIndex)
  }

  // ルーム画面ができるまではリロードで最初に戻す
  function handleBackToRoom() {
    window.location.reload()
  }

  // ---- 画面の出し分け ----

  if (isLoading) {
    return <LoadingScreen onStart={() => setIsLoading(false)} />
  }

  if (sock.connection === 'destroyed') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white gap-6">
        <p className="text-3xl font-bold">ルームが解散されました</p>
        <p className="text-gray-400">誰かの接続が切れるとルームは全員分破棄されます</p>
        <button
          onClick={handleBackToRoom}
          className="px-8 py-3 rounded-lg bg-amber-500 text-gray-900 font-bold hover:bg-amber-400"
        >
          最初に戻る
        </button>
      </div>
    )
  }

  if (stage === 'complete') {
    return <CompleteScreen onBackToRoom={handleBackToRoom} />
  }

  if (stage === 'over') {
    const over = sock.gameOver
    if (!over) {
      return <div className="h-screen bg-black" /> // game:over待ち（すぐ届く）
    }
    const missedQuestion =
      sock.round && sock.roundResult
        ? { text: sock.round.question, correctAnswer: sock.round.choices[sock.roundResult.correct_index] }
        : null
    return (
      <GameOverScreen
        reason={over.reason === 'wrong_answer' ? 'option-miss' : 'timeout'}
        correctCount={Math.max(0, (over.final_round || 1) - 1)}
        totalCount={sock.round ? sock.round.total_rounds : 10}
        missedQuestion={missedQuestion}
        playerAnswer={sock.myVote !== null && sock.round ? sock.round.choices[sock.myVote] : null}
        onBackToRoom={handleBackToRoom}
      />
    )
  }

  // ゲーム中（round受信済み）は動画ステージ
  if (sock.round && stage !== 'idle') {
    const showPlates = stage === 'approach' || stage === 'awaitResult' || stage === 'reveal'
    const counts =
      stage === 'reveal' && sock.roundResult
        ? [
            (sock.roundResult.votes && sock.roundResult.votes['0'] ? sock.roundResult.votes['0'].length : 0),
            (sock.roundResult.votes && sock.roundResult.votes['1'] ? sock.roundResult.votes['1'].length : 0),
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
            questionText={sock.round.question}
            choices={sock.round.choices}
            selectedIndex={sock.myVote}
            onSelect={handleSelect}
            counts={counts}
            votedInfo={sock.votedInfo}
          />
        )}
      </VideoStage>
    )
  }

  if (sock.connection === 'lobby') {
    return (
      <RoomLobby
        roomId={sock.roomId}
        players={sock.players}
        playerId={sock.playerId}
        isHost={sock.isHost}
        onStart={sock.startGame}
      />
    )
  }

  return (
    <RoomEntry
      onCreate={sock.createRoom}
      onJoin={sock.joinRoom}
      connecting={sock.connection === 'connecting'}
      errorMessage={sock.errorMessage}
    />
  )
}
