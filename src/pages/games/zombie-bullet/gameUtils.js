export const LANE_COUNT = 5

export function moveToAdjacentLane(currentLane, direction, laneCount = LANE_COUNT) {
  const lastLane = Math.max(0, laneCount - 1)
  const safeLane = Math.min(lastLane, Math.max(0, Math.round(currentLane)))
  let nextDirection = direction

  if (
    (safeLane === 0 && nextDirection === -1) ||
    (safeLane === lastLane && nextDirection === 1)
  ) {
    nextDirection = nextDirection === 1 ? -1 : 1
  }

  return {
    lane: Math.min(lastLane, Math.max(0, safeLane + nextDirection)),
    direction: nextDirection,
  }
}

export function randomLaneDirection(random = Math.random) {
  return random() < 0.5 ? -1 : 1
}

export function formatClock(remainingMs) {
  const safeMilliseconds = Math.max(0, remainingMs)
  const totalTenths = Math.ceil(safeMilliseconds / 100)
  const seconds = Math.floor(totalTenths / 10)
  const tenths = totalTenths % 10
  return `${String(seconds).padStart(2, '0')}.${tenths}`
}
