import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CalendarDays, Bell } from 'lucide-react-native'
import { fetchBooks, fetchEvents, fetchNotifications } from '@/api/lumina.api'
import { useAuth } from '@/auth/AuthProvider'
import { Card } from '@/components/ui/Card'
import { Screen } from '@/components/ui/Screen'
import { ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors } from '@/theme/colors'
import { spacing } from '@/theme/spacing'
import { formatDayTime } from '@/utils/date'

export function DashboardScreen() {
  const { user } = useAuth()
  const events = useQuery({ queryKey: ['events'], queryFn: fetchEvents })
  const books = useQuery({ queryKey: ['books'], queryFn: fetchBooks })
  const notifications = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications })

  const nextEvent = useMemo(() => {
    const now = Date.now()
    return events.data?.data
      ?.filter((event) => new Date(event.start_time).getTime() >= now)
      .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime())[0]
  }, [events.data?.data])

  const activeBook = books.data?.data?.find((book) => book.status === 'Reading') ?? books.data?.data?.[0]
  const unreadCount = notifications.data?.unread_count ?? notifications.data?.data?.filter((item) => !item.is_read).length ?? 0

  if (events.isLoading || books.isLoading || notifications.isLoading) {
    return <LoadingView />
  }

  if (events.error || books.error || notifications.error) {
    return <ErrorView message="Check your backend connection and try again." />
  }

  return (
    <Screen>
      <View>
        <Text style={styles.eyebrow}>Welcome back</Text>
        <Text style={styles.title}>{user?.name || 'Lumina student'}</Text>
      </View>

      <View style={styles.grid}>
        <Metric icon={<CalendarDays color={colors.primary} />} label="Next" value={nextEvent ? formatDayTime(nextEvent.start_time) : 'No events'} />
        <Metric icon={<BookOpen color={colors.accent} />} label="Library" value={`${books.data?.data?.length ?? 0} books`} />
        <Metric icon={<Bell color={colors.warning} />} label="Unread" value={`${unreadCount}`} />
      </View>

      <Card>
        <Text style={styles.cardTitle}>Today</Text>
        <Text style={styles.cardText}>
          {nextEvent ? `${nextEvent.title} starts ${formatDayTime(nextEvent.start_time)}.` : 'Your calendar is clear. Add a focused study block when you are ready.'}
        </Text>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Continue Reading</Text>
        <Text style={styles.cardText}>
          {activeBook ? `${activeBook.title}${activeBook.author ? ` by ${activeBook.author}` : ''}` : 'Your digital library is ready for your first book.'}
        </Text>
      </Card>
    </Screen>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  eyebrow: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricIcon: {
    height: 32,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  metricValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  cardText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
})
