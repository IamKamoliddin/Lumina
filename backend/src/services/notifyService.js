import { findFreeSlots } from './scheduleService.js'

export const evaluateTriggers = ({ book, events, focusLogs }) => {
  if (book?.current_page) {
    return `You've made great progress on ${book.title}. Schedule next session?`
  }

  const exam = events.find((event) => event.type === 'exam')
  if (exam) {
    return `Your ${exam.subject} exam is approaching. Here's a prep plan.`
  }

  const freeSlots = findFreeSlots(events)
  if (freeSlots.length > 0) {
    return `You have free time at ${freeSlots[0].start_time}. Add a study session?`
  }

  const totalMinutes = focusLogs.reduce((sum, log) => sum + log.total_minutes, 0)
  if (totalMinutes < 300) {
    return "You're behind on your weekly goal. Let's catch up."
  }

  return null
}
