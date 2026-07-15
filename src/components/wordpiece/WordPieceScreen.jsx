import { useEffect, useState } from 'react'
import background from '../../assets/kotobapiece_background.png'
import { PlayerPods } from './PlayerPods'
import { AnswerInputPopup } from './AnswerInputPopup'

// ゲームオーバー理由の表示文言
const OVER_REASONS = {
  wrong_answer: '間違いがあった…',
  timeout: '時間切れ…',
}

// コトバピースの画面本体（見た目担当）。
// 背景画像に黒板パネルが描かれているので、その位置にテキストだけを重ねる。
// round: game:piece_round_start の payload（問題文・担当・制限時間）
// progress: game:piece_progress の payload（null なら入力0人扱い）
// result: game:piece_round_result の payload（null ならラウンド進行中）
// ending: ゲーム終了 { kind: 'clear' | 'over', reason, final_round, total_rounds }（null なら継続中）
// myPlayerIndex: 自分の担当マス（0始まり、-1 なら担当なし）
// onSubmitChar: 自分の1文字が確定したときに呼ばれる（サーバーへの送信は親が担当）
// onLeave: 終了画面の「ルームに戻る」で呼ばれる
export function WordPieceScreen({
  round,
  progress,
  result,
  ending,
  myPlayerIndex,
  onSubmitChar,
  onLeave,
}) {
  // 自分が入力した1文字と、入力ポップアップの開閉状態
  const [myAnswer, setMyAnswer] = useState('')
  const [isPopupOpen, setIsPopupOpen] = useState(false)

  // 残り時間の表示用カウントダウン。実際の締め切り判定はサーバーが行う。
  // ラウンドが変わるときは親が key を変えて再マウントするので、初期値だけで足りる
  const [remaining, setRemaining] = useState(round.time_limit_sec)
  useEffect(() => {
    if (result || ending) return // 結果・終了表示中は止める
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(id)
  }, [round, result, ending])

  // 結果発表後は入力できない
  const inputLocked = Boolean(result || ending)

  const handleSubmit = (char) => {
    setMyAnswer(char)
    setIsPopupOpen(false)
    onSubmitChar?.(char)
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center overflow-hidden text-white">
      <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" />

      {/* 黒板パネルに重ねるテキスト（内側は画像比でおよそ横27%〜77%） */}
      <div className="relative z-10 flex w-[46%] flex-col items-center gap-[6vh] pt-[10vh]">
        {/* ラウンド数・指示・残り時間 */}
        <div className="flex w-full items-center justify-between text-[min(1.6vw,1.25rem)] font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          <span>
            第{round.round}問 / 全{round.total_rounds}問
          </span>
          <span>穴埋めをせよ</span>
          <span className={remaining <= 10 ? 'text-red-400' : ''}>残り {remaining} 秒</span>
        </div>

        <p className="text-balance text-center text-[min(3vw,2.5rem)] font-black leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          {round.question}
        </p>

        {result ? (
          /* ラウンド結果: 組み上がった単語と正解 */
          <div className="flex flex-col items-center gap-[1.5vh] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            <p
              className={`text-[min(2.6vw,2rem)] font-black ${result.is_correct ? 'text-amber-300' : 'text-red-400'}`}
            >
              {result.is_correct ? '正解！' : '残念…'}
            </p>
            <p className="text-[min(2.2vw,1.75rem)] font-black">
              みんなの答え「{result.assembled}」
            </p>
            {!result.is_correct && (
              <p className="text-[min(2.2vw,1.75rem)] font-black text-amber-300">
                正解は「{result.correct_answer}」
              </p>
            )}
          </div>
        ) : (
          /* 進行中: 入力進捗（誰が入力したかはサーバーが伏せているので人数のみ） */
          <p className="text-[min(1.6vw,1.25rem)] font-bold text-gray-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
            入力済み {progress?.filled_count ?? 0} / {round.slot_count} 人
          </p>
        )}
      </div>

      {/* 画面下部のプレイヤー台（参加人数ぶん） */}
      <div className="relative z-10 mt-auto w-full pb-6">
        <PlayerPods
          slots={round.slots}
          myPlayerIndex={myPlayerIndex}
          myAnswer={myAnswer}
          inputLocked={inputLocked}
          results={result?.slots}
          onMyBoxClick={() => setIsPopupOpen(true)}
        />
      </div>

      {/* 自分の1文字を入力するポップアップ（今はキーボード、将来は手書きに差し替え） */}
      {isPopupOpen && !inputLocked && (
        <AnswerInputPopup
          initialValue={myAnswer}
          onSubmit={handleSubmit}
          onClose={() => setIsPopupOpen(false)}
        />
      )}

      {/* クリア / ゲームオーバー */}
      {ending && (
        <div className="fixed inset-0 z-30 flex flex-col items-center justify-center gap-[4vh] bg-black/70">
          <p
            className={`text-[min(8vw,6rem)] font-black drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] ${
              ending.kind === 'clear' ? 'text-amber-300' : 'text-red-400'
            }`}
          >
            {ending.kind === 'clear' ? 'クリア！' : 'ゲームオーバー'}
          </p>
          <p className="text-[min(2.5vw,2rem)] font-bold">
            {ending.kind === 'clear'
              ? `全${ending.total_rounds}問クリア！`
              : `${OVER_REASONS[ending.reason] ?? ''}（第${ending.final_round}問）`}
          </p>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-xl border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 px-10 py-3 text-xl font-black text-neutral-900 shadow hover:brightness-110"
          >
            ルームに戻る
          </button>
        </div>
      )}
    </div>
  )
}
