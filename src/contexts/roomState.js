// バックエンドの一覧は順序が不定なので、ホスト先頭 + 参加順で表示を安定させる。
export function derivePlayers(players) {
  const sorted = [...players].sort(
    (a, b) =>
      Number(b.is_host) - Number(a.is_host) ||
      (a.join_seq ?? 0) - (b.join_seq ?? 0) ||
      a.player_id.localeCompare(b.player_id),
  )
  const named = sorted.filter((player) => player.nickname)
  return {
    players: sorted,
    hostName: named.find((player) => player.is_host)?.nickname ?? '',
    members: named.map((player) => player.nickname),
  }
}

// 一覧更新時に表示情報だけでなく、自分のホスト権限もサーバー情報から更新する。
export function updateRoomPlayers(room, players) {
  if (!room) return room
  const self = players.find((player) => player.player_id === room.playerId)
  return {
    ...room,
    ...derivePlayers(players),
    isHost: Boolean(self?.is_host),
  }
}
