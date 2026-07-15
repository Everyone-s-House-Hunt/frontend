import { useState } from 'react'

// ルーム作成/参加フォーム（入力のローカル状態のみ・接続ロジックはprops経由）
export function RoomEntry({ onCreate, onJoin, connecting, errorMessage }) {
  const [nickname, setNickname] = useState('')
  const [joinId, setJoinId] = useState('')

  const nameOk = nickname.trim().length > 0
  const canCreate = nameOk && !connecting
  const canJoin = nameOk && /^\d{6}$/.test(joinId) && !connecting

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white gap-8">
      <h1 className="text-4xl font-black tracking-widest">イノシシパニック</h1>

      <div className="w-96 flex flex-col gap-6 bg-gray-800 rounded-2xl p-8 shadow-2xl">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-gray-300">ニックネーム</span>
          <input
            type="text"
            value={nickname}
            maxLength={12}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="たなか"
            className="px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-amber-400"
          />
        </label>

        <button
          onClick={() => onCreate(nickname.trim())}
          disabled={!canCreate}
          className="py-3 rounded-lg bg-amber-500 text-gray-900 text-lg font-bold hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ルームを作る
        </button>

        <div className="flex items-center gap-3 text-gray-500 text-sm">
          <div className="flex-1 h-px bg-gray-600" />
          または
          <div className="flex-1 h-px bg-gray-600" />
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            inputMode="numeric"
            value={joinId}
            maxLength={6}
            onChange={(e) => setJoinId(e.target.value.replace(/\D/g, ''))}
            placeholder="ルームID（6桁）"
            className="flex-1 px-4 py-3 rounded-lg bg-gray-700 text-white placeholder-gray-500 outline-none focus:ring-2 focus:ring-amber-400 tracking-widest"
          />
          <button
            onClick={() => onJoin(joinId, nickname.trim())}
            disabled={!canJoin}
            className="px-6 py-3 rounded-lg bg-gray-600 text-white font-bold hover:bg-gray-500 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            参加
          </button>
        </div>

        {connecting && <p className="text-center text-sm text-gray-400">接続中…</p>}
        {errorMessage && <p className="text-center text-sm text-red-400">{errorMessage}</p>}
      </div>
    </div>
  )
}
