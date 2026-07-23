export function createBulletGame(startPayload, receivedAt = Date.now()) {
  return {
    phase: 'playing',
    question: startPayload?.question ?? '',
    targetHits: startPayload?.target_hits ?? 10,
    timeLimitMs: (startPayload?.time_limit_sec ?? 60) * 1000,
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
        currentPlayerId: payload.current_player_id ?? state.currentPlayerId,
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
        currentPlayerId: payload.current_player_id ?? state.currentPlayerId,
        feedback: {
          id: receivedAt,
          kind: payload.reason === 'duplicate' ? 'duplicate' : 'incorrect',
          playerId: payload.player_id,
          answer: payload.answer ?? '',
        },
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
