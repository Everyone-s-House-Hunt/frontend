// 画面下部の「5人のプレイヤー台」。
// 色ごとの設定を並べて、人型アイコン + ラベル + 回答ボックスを表示する。
const PLAYERS = [
  { label: '1人目', body: 'from-red-500 to-red-900', border: 'border-red-300', tag: 'from-red-600 to-red-800' },
  { label: '2人目', body: 'from-blue-500 to-blue-900', border: 'border-blue-300', tag: 'from-blue-600 to-blue-800' },
  { label: '3人目', body: 'from-green-500 to-green-900', border: 'border-green-300', tag: 'from-green-600 to-green-800' },
  { label: '4人目', body: 'from-amber-400 to-amber-700', border: 'border-amber-200', tag: 'from-amber-500 to-amber-700' },
  { label: '5人目', body: 'from-purple-500 to-purple-900', border: 'border-purple-300', tag: 'from-purple-600 to-purple-800' },
]

function PersonIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-[min(4vw,3.5rem)] fill-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]">
      <circle cx="32" cy="18" r="13" />
      <path d="M6 62 a26 26 0 0 1 52 0 z" />
    </svg>
  )
}

export function PlayerPods() {
  return (
    <div className="flex w-full items-end justify-between gap-[2%] px-[3%]">
      {PLAYERS.map((p) => (
        <div key={p.label} className="flex min-w-0 flex-1 flex-col items-center">
          <PersonIcon />

          <div
            className={`relative -mt-1 w-full rounded-xl border-2 bg-gradient-to-b p-[1.2%] shadow-[0_6px_12px_rgba(0,0,0,0.5)] ${p.body} ${p.border}`}
          >
            <div
              className={`mb-[6%] rounded-md border border-white/40 bg-gradient-to-b py-1 text-center text-[min(1.6vw,1.25rem)] font-black text-white drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)] ${p.tag}`}
            >
              {p.label}
            </div>

            <div className="aspect-[4/3] w-full rounded-md border-2 border-white/70 bg-white shadow-inner" />
          </div>
        </div>
      ))}
    </div>
  )
}
