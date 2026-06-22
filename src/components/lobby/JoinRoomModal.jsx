import { useEffect, useState } from 'react'
import modalPanel from '../../assets/join-room-modal-panel.png'

export function JoinRoomModal({ onClose, onSubmit, loading, error }) {
  const [roomId, setRoomId] = useState('')
  const [userName, setUserName] = useState('')
  const canSubmit = roomId.trim() && userName.trim() && !loading

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
    onSubmit({ roomId: roomId.trim(), userName: userName.trim() })
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
      <form onSubmit={handleSubmit} className="relative h-[750px] w-[800px]">
        <img src={modalPanel} alt="" className="absolute inset-0 h-full w-full object-fill" />
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-24 top-24 z-20 grid size-11 place-items-center border-2 border-black bg-white/80 text-2xl font-black text-black transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="閉じる"
        >
          ×
        </button>

        <h2 className="absolute inset-x-0 top-[104px] text-center text-[40px] font-black leading-[100px] text-black">
          ルームに参加します
        </h2>
        <p className="absolute inset-x-0 top-[205px] text-center text-2xl font-black leading-[30px] text-white drop-shadow-[2px_2px_0_rgba(0,0,0,0.7)]">
          ルームIDとルームで使用するユーザーネーム
          <br />
          を入力してください
        </p>

        <label className="absolute left-1/2 top-[322px] block h-[46px] w-[521px] -translate-x-1/2 border-[3px] border-white bg-black">
          <span className="absolute left-12 top-1 text-2xl font-black leading-[30px] text-white">
            ルームID :
          </span>
          <input
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
            className="absolute bottom-0 right-5 top-0 w-[285px] bg-transparent text-2xl font-bold text-white outline-none"
            aria-label="ルームID"
            autoComplete="off"
          />
        </label>

        <label className="absolute left-1/2 top-[422px] block h-[46px] w-[521px] -translate-x-1/2 border-[3px] border-white bg-black">
          <span className="absolute left-5 top-1 text-2xl font-black leading-[30px] text-white">
            ユーザーネーム :
          </span>
          <input
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            className="absolute bottom-0 right-5 top-0 w-[285px] bg-transparent text-2xl font-bold text-white outline-none"
            aria-label="ユーザーネーム"
            autoComplete="off"
          />
        </label>

        {error && (
          <p className="absolute inset-x-0 top-[496px] text-center text-lg font-black text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="absolute left-1/2 top-[524px] flex h-[72px] w-[284px] -translate-x-1/2 items-center justify-center whitespace-nowrap border-[3px] border-white bg-white/60 px-[30px] py-[25px] text-[32px] font-black leading-[22px] text-black backdrop-blur-sm transition hover:bg-white/75 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? '参加中...' : 'ゲームスタート'}
        </button>
      </form>
    </div>
  )
}
