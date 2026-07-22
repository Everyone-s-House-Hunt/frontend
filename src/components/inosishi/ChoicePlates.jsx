// 問題文ボックス + 白い横長プレート2枚（表示のみ）
// 左プレート = choice_index 0 = 左の扉、右プレート = choice_index 1 = 右の扉
// counts: [左の得票数, 右の得票数] | null（ラウンド結果が来たら表示される）
// votedInfo: { voted, total } | null（投票進捗。誰が何に入れたかは見えない仕様）
export function ChoicePlates({ questionText, choices, selectedIndex, onSelect, counts, votedInfo }) {
  return (
    <>
      {/* 上部の問題文ボックス（横長・半透明白） */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-3/4 max-w-3xl bg-white/80 rounded-xl px-8 py-4 text-center text-2xl font-bold text-gray-800 shadow-lg">
        {questionText}
      </div>

      {/* 投票進捗（右上） */}
      {votedInfo && counts === null && (
        <div className="absolute top-8 right-6 bg-black/60 text-white rounded-lg px-4 py-2 text-sm font-bold">
          投票済み {votedInfo.voted}/{votedInfo.total}人
        </div>
      )}

      {/* 画面中央から左右均等に離した白プレート */}
      <div className="absolute inset-x-0 bottom-[16%] flex justify-center gap-[12%]">
        {choices.map((choice, i) => {
          const isSelected = selectedIndex === i
          return (
            <div key={choice + i} className="relative">
              {/* 何人がこの選択肢を選んだか（ラウンド結果受信後に表示） */}
              {counts !== null && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900/85 text-white text-2xl font-black px-5 py-1.5 rounded-full whitespace-nowrap">
                  {counts[i]}人
                </div>
              )}
              <button
                onClick={() => onSelect(i)}
                disabled={selectedIndex !== null}
                className={`w-64 h-24 bg-white/90 rounded-lg shadow-2xl text-3xl font-bold text-gray-800
                  transition-transform hover:scale-105 active:scale-95
                  disabled:hover:scale-100
                  ${isSelected ? 'ring-4 ring-amber-400 scale-105' : selectedIndex !== null ? 'opacity-40' : ''}`}
              >
                {choice}
              </button>
            </div>
          )
        })}
      </div>
    </>
  )
}
