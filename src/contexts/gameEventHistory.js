export function replayGameEvents(events, callback) {
  events.forEach((event) => {
    callback(event.type, event.payload, { ...event, replayed: true })
  })
}
