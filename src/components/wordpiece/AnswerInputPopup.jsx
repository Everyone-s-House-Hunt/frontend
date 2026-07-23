import { useEffect, useRef, useState } from 'react'

// 自分の回答（1文字）を入力するポップアップ。
// 現状はキーボード入力だが、将来は入力部分を手書きキャンバスに差し替える予定。
// そのため「入力UI → onSubmit(1文字) を呼ぶ」というインターフェースだけ保って作ってある。
export function AnswerInputPopup({ initialValue = '', onSubmit, onClose }) {
  const [value, setValue] = useState(initialValue)
  const inputRef = useRef(null)

  // 開いたら即入力できるようにフォーカスする
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = () => {
    if (!value) return
    onSubmit(value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  return (
    // 背景の黒幕。ここをタップしたら閉じる
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[min(90vw,24rem)] rounded-2xl border-4 border-amber-300 bg-gradient-to-b from-neutral-900 to-neutral-800 px-8 pb-8 pt-6 text-white shadow-[0_0_30px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-lg font-black">きみの1文字を入力！</p>

        {/* 入力エリア（将来ここを手書きキャンバスに差し替える） */}
        <div className="mt-5 flex justify-center">
          <input
            ref={inputRef}
            type="text"
            value={value}
            maxLength={1}
            onChange={(e) => setValue(e.target.value.slice(-1))}
            onKeyDown={handleKeyDown}
            className="size-24 rounded-md border-2 border-amber-200/70 bg-white/90 text-center text-5xl font-black text-neutral-900 shadow-inner outline-none focus:border-amber-300"
          />
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border-2 border-white/40 bg-neutral-700 px-6 py-2 text-sm font-black shadow hover:bg-neutral-600"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!value}
            className="rounded-md border-2 border-amber-200 bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-2 text-sm font-black text-neutral-900 shadow hover:from-amber-200 hover:to-amber-400 disabled:opacity-40"
          >
            決定
          </button>
        </div>
      </div>
    </div>
  )
}
