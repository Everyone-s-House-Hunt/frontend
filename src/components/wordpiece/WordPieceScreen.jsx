import background from '../../assets/kotobapiace_background.png'
import { PlayerPods } from './PlayerPods'

// コトバピースの画面本体（見た目担当）。
// 上部に「問題」パネルを配置し、その中に問題文・回答マス・正解文字数を表示する。
export function WordPieceScreen({ question }) {
  // 正解の文字数（回答マスの数）。今は正解文字列の長さから算出。
  const answerLength = question.correctAnswer.length

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden text-white">
      <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" />

      <div className="relative z-10 flex w-full flex-col items-center gap-6 px-[3%] pt-[4vh]">
        {/* 問題パネル */}
        <div className="relative w-[60%] min-w-[560px] rounded-2xl border-4 border-amber-300 bg-gradient-to-b from-neutral-900 to-neutral-800 px-10 pb-9 pt-10 shadow-[0_0_30px_rgba(0,0,0,0.6)]">
          {/* 「問題」ラベル */}
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-md border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 px-10 py-1 text-lg font-black text-neutral-900 shadow">
            問題
          </div>

          <p className="text-center text-2xl font-black leading-relaxed">{question.text}</p>

          <p className="mt-3 text-center text-sm font-bold text-gray-300">
            正解の誤文字を <span className="text-amber-300">1人一文字ずつ回答する</span>（{answerLength}文字）
          </p>

          {/* 回答マス */}
          <div className="mt-6 flex justify-center gap-3">
            {Array.from({ length: answerLength }).map((_, i) => (
              <div
                key={i}
                className="size-16 rounded-md border-2 border-amber-200/70 bg-white/90 shadow-inner"
              />
            ))}
          </div>
        </div>
      </div>

      {/* 画面下部の5人のプレイヤー台 */}
      <div className="relative z-10 mt-auto w-full pb-6">
        <PlayerPods />
      </div>
    </div>
  )
}
