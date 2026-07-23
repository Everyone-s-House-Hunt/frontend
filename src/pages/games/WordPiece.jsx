import { useEffect } from 'react'
import { useGameState } from '../../hooks/useGameState'
import { WordPieceScreen } from '../../components/wordpiece/WordPieceScreen'

// コトバピース用の問題（正解は5文字）。将来はAPI／専用データに差し替える。
const WORD_PIECE_QUESTION = {
  id: 'wp-1',
  text: 'アメリカ合衆国の首都はどこでしょう？',
  correctAnswer: 'ワシントン',
}

export function WordPiece() {
  const { phase, startGame } = useGameState()

  // マウント時に即スタート
  useEffect(() => {
    startGame()
  }, [startGame])

  if (phase === 'question') {
    return <WordPieceScreen question={WORD_PIECE_QUESTION} />
  }

  if (phase === 'result') {
    return <div className="flex items-center justify-center h-screen text-4xl">クリア！（仮）</div>
  }

  return null
}
