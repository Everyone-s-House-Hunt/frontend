export const LANE_COUNT = 5

export function laneForPlayerIndex(playerIndex, playerCount) {
  const numericCount = Number(playerCount)
  const numericIndex = Number(playerIndex)

  if (!Number.isFinite(numericCount) || numericCount <= 1) {
    return 0
  }

  const safePlayerCount = Math.min(LANE_COUNT, Math.floor(numericCount))
  const safePlayerIndex = Number.isFinite(numericIndex)
    ? Math.min(safePlayerCount - 1, Math.max(0, Math.floor(numericIndex)))
    : 0

  return Math.round((safePlayerIndex * (LANE_COUNT - 1)) / (safePlayerCount - 1))
}

export function formatClock(remainingMs) {
  const safeMilliseconds = Math.max(0, remainingMs)
  const totalTenths = Math.ceil(safeMilliseconds / 100)
  const seconds = Math.floor(totalTenths / 10)
  const tenths = totalTenths % 10
  return `${String(seconds).padStart(2, '0')}.${tenths}`
}
