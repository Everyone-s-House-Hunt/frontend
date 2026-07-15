// 参加者一覧とゲーム開始待ち（表示のみ）
export function RoomLobby({ roomId, players, playerId, isHost, onStart }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white gap-8">
      <div className="text-center">
        <p className="text-sm text-gray-400">ルームID</p>
        <p className="text-6xl font-black tracking-[0.3em] mt-1">{roomId}</p>
        <p className="text-xs text-gray-500 mt-2">友達にこのIDを伝えて参加してもらおう（最大5人）</p>
      </div>

      <div className="w-96 bg-gray-800 rounded-2xl p-6 shadow-2xl">
        <p className="text-sm text-gray-300 mb-3">参加者（{players.length}/5）</p>
        <ul className="flex flex-col gap-2">
          {players.map((p) => (
            <li
              key={p.player_id}
              className={`px-4 py-3 rounded-lg flex items-center gap-3
                ${p.player_id === playerId ? 'bg-amber-500/20 ring-1 ring-amber-400' : 'bg-gray-700'}`}
            >
              <span className="font-bold">{p.nickname}</span>
              {p.is_host && <span className="text-xs bg-amber-400 text-gray-900 font-bold px-2 py-0.5 rounded">ホスト</span>}
              {p.player_id === playerId && <span className="text-xs text-amber-300">あなた</span>}
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <button
          onClick={onStart}
          className="px-12 py-4 rounded-xl bg-amber-500 text-gray-900 text-xl font-black hover:bg-amber-400 active:scale-95 transition-transform"
        >
          ゲーム開始
        </button>
      ) : (
        <p className="text-gray-400 animate-pulse">ホストの開始を待っています…</p>
      )}
    </div>
  )
}
