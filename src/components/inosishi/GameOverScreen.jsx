import boarImg from '../../assets/boar-chasing.png'

// ゲームオーバー画面（表示のみ）
// reason: 'option-miss' → 黒背景 / 'timeout' → イノシシに襲われた背景
export function GameOverScreen({ reason, correctCount, totalCount, missedQuestion, playerAnswer, onBackToRoom }) {
  return (
    <div className="relative w-full h-screen overflow-hidden bg-black flex flex-col items-center justify-center gap-10">
      {reason === 'timeout' && (
        <>
          <img src={boarImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-black/45" />
        </>
      )}

      <h1 className="relative text-6xl font-black text-white tracking-widest">ゲームオーバー</h1>

      {/* 結果パネル: 左=正答数、右=間違えた問題と答え */}
      <div className="relative w-4/5 max-w-3xl bg-gray-500/60 border border-white/90 grid grid-cols-2 divide-x divide-white/80 text-white">
        <div className="px-8 py-10 flex flex-col items-center gap-8">
          <p className="text-2xl font-black">正答数</p>
          <p className="text-7xl font-black">
            {correctCount}
            <span className="text-4xl">／{totalCount}</span>
          </p>
        </div>
        <div className="px-8 py-10 flex flex-col items-center gap-6">
          <p className="text-2xl font-black">間違えた問題と答え</p>
          {missedQuestion && (
            <div className="text-lg leading-relaxed text-center">
              <p className="font-bold">{missedQuestion.text}</p>
              <p className="mt-4 text-white/80">
                {playerAnswer ? `あなたの答え: ${playerAnswer}` : '時間切れ（未回答）'}
              </p>
              <p className="text-amber-300 font-bold">正解: {missedQuestion.correctAnswer}</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={onBackToRoom}
        className="relative px-10 py-3 bg-gray-600/90 border border-white text-white text-xl font-black hover:bg-gray-500 active:scale-95 transition-transform"
      >
        ルームに戻る
      </button>
    </div>
  )
}
