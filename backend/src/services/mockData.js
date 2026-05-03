export const subjectSeed = [
  { id: 'subj-math', name: 'Mathematics', color_hex: '#38BDF8' },
  { id: 'subj-programming', name: 'Programming', color_hex: '#34D399' },
  { id: 'subj-history', name: 'History', color_hex: '#FBBF24' },
  { id: 'subj-physics', name: 'Physics', color_hex: '#F472B6' },
]

export const bookSeed = [
  {
    id: 'book-clean-code',
    title: 'Clean Code',
    author: 'Robert C. Martin',
    subject: 'Programming',
    total_pages: 464,
    current_page: 148,
    status: 'Reading',
  },
]

export const eventSeed = [
  {
    id: 'event-physics-exam',
    title: 'Physics Exam',
    subject: 'Physics',
    type: 'exam',
    start_time: '2026-04-29T14:00:00.000Z',
    end_time: '2026-04-29T16:00:00.000Z',
    is_confirmed: true,
  },
]

export const focusLogSeed = [
  {
    id: 'focus-1',
    subject: 'Programming',
    total_minutes: 90,
    started_at: '2026-04-26T13:00:00.000Z',
  },
]
