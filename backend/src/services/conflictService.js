export const detectConflict = (events, nextEvent) =>
  events.find((event) => {
    const currentStart = new Date(event.start_time).getTime()
    const currentEnd = new Date(event.end_time).getTime()
    const nextStart = new Date(nextEvent.start_time).getTime()
    const nextEnd = new Date(nextEvent.end_time).getTime()

    return nextStart < currentEnd && nextEnd > currentStart
  }) ?? null
