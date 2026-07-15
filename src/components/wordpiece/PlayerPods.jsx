import baseRed from '../../assets/base_red.png'
import baseRedCorrect from '../../assets/base_red_correct.png'
import baseRedMistake from '../../assets/base_red_mistake.png'
import baseBlue from '../../assets/base_blue.png'
import baseBlueCorrect from '../../assets/base_blue_correct.png'
import baseBlueMistake from '../../assets/base_blue_mistake.png'
import baseGreen from '../../assets/base_green.png'
import baseGreenCorrect from '../../assets/base_green_correct.png'
import baseGreenMistake from '../../assets/base_green_mistake.png'
import baseYellow from '../../assets/base_yellow.png'
import baseYellowCorrect from '../../assets/base_yellow_correct.png'
import baseYellowMistake from '../../assets/base_yellow_mistake.png'
import basePurple from '../../assets/base_purple.png'
import basePurpleCorrect from '../../assets/base_purple_correct.png'
import basePurpleMistake from '../../assets/base_purple_mistake.png'

// 参加順に割り当てる台座の色。結果発表時はマスが青（正解）/ 赤（不正解）の画像に切り替わる
const BASES = [
  { normal: baseRed, correct: baseRedCorrect, mistake: baseRedMistake },
  { normal: baseBlue, correct: baseBlueCorrect, mistake: baseBlueMistake },
  { normal: baseGreen, correct: baseGreenCorrect, mistake: baseGreenMistake },
  { normal: baseYellow, correct: baseYellowCorrect, mistake: baseYellowMistake },
  { normal: basePurple, correct: basePurpleCorrect, mistake: basePurpleMistake },
]

function PersonIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-[min(4vw,3.5rem)] fill-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]">
      <circle cx="32" cy="18" r="13" />
      <path d="M6 62 a26 26 0 0 1 52 0 z" />
    </svg>
  )
}

// 画面下部のプレイヤー台。参加人数（3〜5人）ぶんの台座画像を並べ、
// 中央の白マスに回答（1文字）を重ねて表示する。
// 結果発表時は台座画像ごと correct（青マス）/ mistake（赤マス）に差し替えて正誤を表す。
// slots: このラウンドの担当割り当て（{position, player_id, nickname} の配列）
// myPlayerIndex: 自分が担当しているマスの番号（0始まり、-1 なら担当なし）
// myAnswer: 自分が入力済みの1文字（未入力なら空文字）
// inputLocked: 結果発表後など、入力を受け付けないとき true
// results: ラウンド結果の各マス（{char, correct_char, ok} の配列）。null ならラウンド進行中
// onMyBoxClick: 自分の回答マスをタップしたときに呼ばれる
export function PlayerPods({
  slots = [],
  myPlayerIndex,
  myAnswer = '',
  inputLocked = false,
  results,
  onMyBoxClick,
}) {
  return (
    <div className="flex w-full items-end justify-center gap-[2%] px-[3%]">
      {slots.map((slot, i) => {
        const isMine = i === myPlayerIndex
        const result = results?.[i]
        const base = BASES[i % BASES.length]
        const baseImage = result ? (result.ok ? base.correct : base.mistake) : base.normal

        return (
          <div key={slot.position} className="flex w-[18%] flex-col items-center">
            <PersonIcon />

            <div className="relative -mt-1 w-full">
              <img src={baseImage} alt="" className="w-full" />

              {/* 台座画像のマス（横30%〜70%・縦36%〜75%）に重ねる表示 */}
              {result ? (
                /* 結果発表: 入力文字（未入力は ＿）と、間違えたマスは正解文字。
                   マスは青/赤に変わっているので文字は白で載せる */
                <div className="absolute bottom-[25%] left-[30%] right-[30%] top-[36%] flex flex-col items-center justify-center text-white drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
                  <span className="text-[min(4.5vw,3rem)] font-black leading-none">
                    {result.char || '＿'}
                  </span>
                  {!result.ok && (
                    <span className="mt-[4%] text-[min(1.2vw,0.9rem)] font-black">
                      正解 {result.correct_char}
                    </span>
                  )}
                </div>
              ) : isMine ? (
                /* 自分の担当マスだけタップで入力ポップアップを開ける（締切まで変更可） */
                <button
                  type="button"
                  onClick={onMyBoxClick}
                  disabled={inputLocked}
                  className="absolute bottom-[25%] left-[30%] right-[30%] top-[36%] flex cursor-pointer flex-col items-center justify-center rounded-md text-neutral-900 ring-4 ring-amber-300/80 hover:bg-amber-100/50"
                >
                  <span className="text-[min(4.5vw,3rem)] font-black leading-none">{myAnswer}</span>
                  <span className="mt-[4%] text-[min(1vw,0.75rem)] font-bold text-neutral-400">
                    {myAnswer ? 'タップで変更' : 'タップで入力'}
                  </span>
                </button>
              ) : null}

              {/* ニックネーム（台座下部の帯に重ねる） */}
              <div className="absolute bottom-[6%] left-1/2 max-w-[80%] -translate-x-1/2 truncate whitespace-nowrap rounded-md bg-black/60 px-[10%] py-[1%] text-center text-[min(1.4vw,1.1rem)] font-black text-white">
                {slot.nickname || `${i + 1}人目`}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
