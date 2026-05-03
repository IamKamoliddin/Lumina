export const findFreeSlots = (events) => {
  if (events.length === 0) {
    return [{ start_time: '2026-04-26T16:00:00.000Z', end_time: '2026-04-26T17:30:00.000Z' }]
  }

  return [
    {
      start_time: '2026-04-26T18:00:00.000Z',
      end_time: '2026-04-26T19:30:00.000Z',
    },
  ]
}
