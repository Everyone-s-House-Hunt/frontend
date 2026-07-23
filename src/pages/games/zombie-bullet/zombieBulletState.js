export function createBulletGame(startPayload, receivedAt = Date.now()) {
  return {
    phase: 'playing',
    question: startPayload?.question ?? '',
    targetHits: startPayload?.target_hits ?? 10,
    timeLimitMs: (startPayload?.time_limit_sec ?? 85) * 1000,
    players: [...(startPayload?.players ?? [])].sort(
      (left, right) => (left.position ?? 0) - (right.position ?? 0),
    ),
    currentPlayerId: startPayload?.current_player_id ?? '',
    correctCount: 0,
    used: [],
    startedAt: receivedAt,
    finalRound: 0,
    feedback: null,
  }
}

export function reduceBulletGame(state, event) {
  const { type, payload = {}, receivedAt = Date.now() } = event
  const serverCurrentPlayer = (playerId) =>
    playerId && state.players.some((player) => player.player_id === playerId)
      ? playerId
      : state.currentPlayerId

  switch (type) {
    case 'game:bullet_start':
      return createBulletGame(payload, receivedAt)
    case 'game:bullet_hit': {
      const answer = payload.answer?.trim()
      const used =
        answer && !state.used.includes(answer) ? [...state.used, answer] : state.used
      return {
        ...state,
        correctCount: payload.correct_count ?? state.correctCount,
        targetHits: payload.target_hits ?? state.targetHits,
        currentPlayerId: serverCurrentPlayer(payload.current_player_id),
        // backend の used は map 由来で順序不定。命中イベントの受信順を表示順にする。
        used,
        feedback: {
          id: receivedAt,
          kind: 'correct',
          playerId: payload.player_id,
          answer: payload.answer ?? '',
        },
      }
    }
    case 'game:bullet_miss':
      return {
        ...state,
        currentPlayerId: serverCurrentPlayer(payload.current_player_id),
        feedback: {
          id: receivedAt,
          kind: payload.reason === 'duplicate' ? 'duplicate' : 'incorrect',
          playerId: payload.player_id,
          answer: payload.answer ?? '',
        },
      }
    case 'game:player_left': {
      const players = [...(payload.players ?? [])]
        .sort(
          (left, right) =>
            (left.join_seq ?? 0) - (right.join_seq ?? 0) ||
            left.player_id.localeCompare(right.player_id),
        )
        .map((player, position) => ({ ...player, position }))
      const currentPlayerId = players.some(
        (player) => player.player_id === payload.current_player_id,
      )
        ? payload.current_player_id
        : players[0]?.player_id ?? ''
      return {
        ...state,
        players,
        currentPlayerId,
        feedback: {
          id: receivedAt,
          kind: 'player_left',
          playerId: payload.disconnected_player_id,
          nickname: payload.disconnected_nickname || 'メンバー',
        },
      }
    }
    case 'game:clear':
      return {
        ...state,
        phase: 'win',
        correctCount: state.targetHits,
        finalRound: payload.total_rounds ?? state.targetHits,
      }
    case 'game:over':
      return {
        ...state,
        phase: 'lose',
        finalRound: payload.final_round ?? state.correctCount,
      }
    default:
      return state
  }
}

export function remainingBulletTime(game, now = Date.now()) {
  if (game.phase !== 'playing') return Math.max(0, game.timeLimitMs - (now - game.startedAt))
  return Math.max(0, game.timeLimitMs - (now - game.startedAt))
}

export function playerName(players, playerId) {
  return players.find((player) => player.player_id === playerId)?.nickname ?? 'プレイヤー'
}
