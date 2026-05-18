import { StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, UserRound } from 'lucide-react-native'
import { fetchProfile } from '@/api/lumina.api'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Screen } from '@/components/ui/Screen'
import { ErrorView, LoadingView } from '@/components/ui/StateViews'
import { colors } from '@/theme/colors'
import { spacing } from '@/theme/spacing'

export function ProfileScreen() {
  const { logout, isSubmitting } = useAuth()
  const { data, isLoading, error } = useQuery({ queryKey: ['profile'], queryFn: fetchProfile })

  if (isLoading) return <LoadingView label="Loading profile..." />
  if (error) return <ErrorView message="Unable to load profile settings." />

  const user = data?.user

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>

      <Card>
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <UserRound color={colors.primary} size={28} />
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.meta}>{user?.email}</Text>
            <Text style={styles.meta}>@{user?.username || 'lumina'}</Text>
          </View>
        </View>
      </Card>

      <Card>
        <View style={styles.settingRow}>
          <ShieldCheck color={colors.success} />
          <View style={styles.profileCopy}>
            <Text style={styles.settingTitle}>Secure mobile session</Text>
            <Text style={styles.meta}>Tokens are stored with Expo SecureStore.</Text>
          </View>
        </View>
      </Card>

      <Button label="Log out" variant="danger" loading={isSubmitting} onPress={logout} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  meta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
})
