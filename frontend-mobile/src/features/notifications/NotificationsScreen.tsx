import { StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react-native'
import { fetchNotifications, markNotificationRead } from '@/api/lumina.api'
import { Card } from '@/components/ui/Card'
import { Screen } from '@/components/ui/Screen'
import { EmptyState, ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors } from '@/theme/colors'
import { formatShortDate } from '@/utils/date'

export function NotificationsScreen() {
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications })
  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  if (isLoading) return <LoadingView label="Loading notifications..." />
  if (error) return <ErrorView message="Unable to load notifications." />

  const notifications = data?.data ?? []

  return (
    <Screen>
      <Text style={styles.title}>Notifications</Text>
      {notifications.length === 0 ? (
        <EmptyState title="All quiet" message="Reminders and updates will appear here." />
      ) : (
        notifications.map((item) => (
          <Card key={item.id}>
            <View style={styles.row}>
              <View style={[styles.icon, !item.is_read && styles.iconActive]}>
                <Bell size={18} color={item.is_read ? colors.textMuted : colors.primary} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.message}>{item.message}</Text>
                <Text
                  style={styles.meta}
                  onPress={() => {
                    if (!item.is_read) readMutation.mutate(item.id)
                  }}
                >
                  {formatShortDate(item.created_at)} · {item.is_read ? 'Read' : 'Mark read'}
                </Text>
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
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: '#DBEAFE',
  },
  copy: {
    flex: 1,
    gap: 5,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
})
