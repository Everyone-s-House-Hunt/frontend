import { useState } from 'react'

// ---- APIに差し替えるときはここを変える ----
const QUESTIONS = [
  { id: 1, text: '日本の首都は？', choices: ['東京', '大阪'], correctAnswer: '東京' },
  { id: 2, text: '富士山の高さは3776mである', choices: ['◯', '✕'], correctAnswer: '◯' },
  { id: 3, text: 'イノシシは泳げる', choices: ['◯', '✕'], correctAnswer: '◯' },
  { id: 4, text: '月は地球より大きい', choices: ['◯', '✕'], correctAnswer: '✕' },
]

export function useGameState() {
  // ゲームの進行フェーズ: 'waiting' | 'question' | 'complete'(全問クリア) | 'gameover'
  const [phase, setPhase] = useState('waiting')

  // 現在表示中の問題のインデックス
  const [questionIndex, setQuestionIndex] = useState(0)

  // 正解した数（ゲームオーバー画面の 正答数 n／total に使う）
  const [correctCount, setCorrectCount] = useState(0)

  // ゲームオーバー詳細: { reason: 'option-miss' | 'timeout', question, playerAnswer }
  const [gameoverInfo, setGameoverInfo] = useState(null)

  // 各プレイヤーの回答: { [playerId]: answer }（マルチプレイヤー用・未使用）
  const [votes, setVotes] = useState({})

  // 現在の問題オブジェクト
  const currentQuestion = QUESTIONS[questionIndex]
  const totalCount = QUESTIONS.length

  // ゲーム開始: 最初の問題に戻して全状態をリセット
  function startGame() {
    setQuestionIndex(0)
    setCorrectCount(0)
    setGameoverInfo(null)
    setVotes({})
    setPhase('question')
  }

  // プレイヤーの回答を登録する
  function submitVote(playerId, answer) {
    setVotes((prev) => ({ ...prev, [playerId]: answer }))
  }

  // 正解: 正答数を加算。最終問題なら complete、まだあれば次の問題へ
  function advanceCorrect() {
    setCorrectCount((prev) => prev + 1)
    if (questionIndex + 1 >= QUESTIONS.length) {
      setPhase('complete')
      return
    }
    setVotes({})
    setQuestionIndex((prev) => prev + 1)
  }

  // 不正解/時間切れ: 理由と間違えた問題を記録して gameover へ
  function failGame(reason, playerAnswer = null) {
    setGameoverInfo({ reason, question: currentQuestion, playerAnswer })
    setPhase('gameover')
  }

  return {
    phase,
    currentQuestion,
    questionIndex,
    totalCount,
    correctCount,
    gameoverInfo,
    votes,
    startGame,
    submitVote,
    advanceCorrect,
    failGame,
  }
}
