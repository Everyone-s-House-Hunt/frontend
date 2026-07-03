import { useEffect, useState } from 'react'
import modalPanel from '../../assets/join-room-modal-panel.png'

// ルーム参加ポップアップ。入力はルームIDのみ（ニックネームは入室時に「メンバーN」を自動採番し、
// ルーム管理画面で自分の名前をクリックすれば変更できる）。
export function JoinRoomModal({ onClose, onSubmit, loading, error }) {
  const [roomId, setRoomId] = useState('')
  const canSubmit = roomId.trim() && !loading

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !loading) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, onClose])

  function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit({ roomId: roomId.trim() })
  }

  function handleBackdropMouseDown(event) {
    if (event.target === event.currentTarget && !loading) {
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid min-w-[1024px] place-items-center bg-black/30 px-6 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
    >
      {/* 入力がルームIDだけなので、パネルは縦を詰めた小ぶりなサイズで間延びを防ぐ */}
      <form onSubmit={handleSubmit} className="relative h-[540px] w-[720px]">
        <img src={modalPanel} alt="" className="absolute inset-0 h-full w-full object-fill" />
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-[60px] top-[70px] z-20 grid size-11 place-items-center border-2 border-black bg-white/80 text-2xl font-black text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="閉じる"
        >
          ×
        </button>

        <h2 className="heading-outline-sm absolute inset-x-0 top-[96px] text-center text-[36px] font-black leading-[48px] text-black">
          ルームに参加します
        </h2>
        <p className="absolute inset-x-0 top-[172px] text-center text-2xl font-black leading-[30px] text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]">
          ルームIDを入力してください
        </p>

        <label className="absolute left-1/2 top-[248px] block h-[56px] w-[440px] -translate-x-1/2 border-[3px] border-white bg-black">
          <span className="absolute left-8 top-2.5 text-2xl font-black leading-[30px] text-white">
            ルームID :
          </span>
          <input
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            className="absolute bottom-0 right-6 top-0 w-[250px] bg-transparent text-2xl font-bold text-white outline-none"
            aria-label="ルームID"
            autoComplete="off"
            autoFocus
          />
        </label>

        {error && (
          <p className="absolute inset-x-0 top-[318px] text-center text-lg font-black text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="absolute left-1/2 top-[356px] flex h-[72px] w-[284px] -translate-x-1/2 items-center justify-center whitespace-nowrap border-[3px] border-white bg-white/60 px-[30px] py-[25px] text-[32px] font-black leading-[22px] text-black backdrop-blur-sm transition hover:bg-white/75 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <span className="heading-outline-sm">{loading ? '参加中...' : 'ゲームスタート'}</span>
        </button>
      </form>
    </div>
  )
}
