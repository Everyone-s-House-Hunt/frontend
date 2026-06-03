import { useEffect } from 'react'
import { useGameState } from '../../hooks/useGameState'
import { RoadScreen } from '../../components/mansion/RoadScreen'

export function Mansion() {
  const { phase, currentQuestion, questionIndex, startGame, nextQuestion } = useGameState()

  // マウント時に即スタート
  useEffect(() => {
    startGame()
  }, [])

  function handleAnswer(isCorrect) {
    nextQuestion(isCorrect)
  }

  if (phase === 'question') {
    return (
      <RoadScreen
        key={questionIndex}
        question={currentQuestion}
        onAnswer={handleAnswer}
      />
    )
  }

  if (phase === 'result') {
    return <div className="flex items-center justify-center h-screen text-4xl">クリア！（仮）</div>
  }

  return null
}
