import { StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { fetchEvents } from '@/api/lumina.api'
import { Card } from '@/components/ui/Card'
import { Screen } from '@/components/ui/Screen'
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors } from '@/theme/colors'
import { formatDayTime } from '@/utils/date'

export function CalendarScreen() {
  const { data, isLoading, error } = useQuery({ queryKey: ['events'], queryFn: fetchEvents })

  if (isLoading) return <LoadingView label="Loading calendar..." />
  if (error) return <ErrorView message="Unable to load calendar events." />

  const events = [...(data?.data ?? [])].sort(
    (left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime(),
  )

  return (
    <Screen>
      <Text style={styles.title}>Calendar</Text>
      {events.length === 0 ? (
        <EmptyState title="No events yet" message="Your study sessions, exams, and deadlines will appear here." />
      ) : (
        events.map((event) => (
          <Card key={event.id}>
            <View style={styles.row}>
              <View style={styles.dot} />
              <View style={styles.copy}>
                <Text style={styles.name}>{event.title}</Text>
                <Text style={styles.meta}>{formatDayTime(event.start_time)}</Text>
                <Text style={styles.meta}>{event.subject_name || event.subject || 'General/AI'}</Text>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 6,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
  },
})
