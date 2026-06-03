import { useState } from 'react'

// ---- APIに差し替えるときはここを変える ----
const QUESTIONS = [
  { id: 1, text: '日本の首都は？', choices: ['東京', '大阪'], correctAnswer: '東京' },
  { id: 2, text: '富士山の高さは3776mである', choices: ['◯', '✕'], correctAnswer: '◯' },
]

export function useGameState() {
  // ゲームの進行フェーズ: 'waiting' | 'question' | 'result' | 'gameover'
  const [phase, setPhase] = useState('waiting')

  // 現在表示中の問題のインデックス
  const [questionIndex, setQuestionIndex] = useState(0)

  // 各プレイヤーの回答: { [playerId]: answer }
  const [votes, setVotes] = useState({})

  // 現在の問題オブジェクト
  const currentQuestion = QUESTIONS[questionIndex]

  // ゲーム開始: 最初の問題に戻して回答をリセット
  function startGame() {
    setQuestionIndex(0)
    setVotes({})
    setPhase('question')
  }

  // プレイヤーの回答を登録する
  function submitVote(playerId, answer) {
    setVotes((prev) => ({ ...prev, [playerId]: answer }))
  }

  // 正解/不正解を受け取り次のフェーズへ進む
  // 不正解 → gameover、正解で最終問題 → result（クリア）、正解で続きあり → 次の question
  function nextQuestion(isCorrect) {
    if (!isCorrect) {
      setPhase('gameover')
      return
    }
    if (questionIndex + 1 >= QUESTIONS.length) {
      setPhase('result')
      return
    }
    setVotes({})
    setQuestionIndex((prev) => prev + 1)
    setPhase('question')
  }

  return {
    phase,
    currentQuestion,
    questionIndex,
    votes,
    startGame,
    submitVote,
    nextQuestion,
  }
}
