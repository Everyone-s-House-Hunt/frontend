import questionPlate from '../../assets/question_plate.jpeg'

// textOnly: true のとき画像なしでテキストだけ表示（画像にプレートが埋め込まれているステップ用）
export function ChoicePanel({ choice, textOnly = false, className = '' }) {
  if (textOnly) {
    return (
      <span className={`text-2xl font-bold drop-shadow-lg ${className}`}>
        {choice}
      </span>
    )
  }

  return (
    <div className="relative">
      <img src={questionPlate} alt={choice} className="w-72 h-auto" />
      <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-gray-800">
        {choice}
      </span>
    </div>
  )
}
