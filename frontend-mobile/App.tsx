import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Bell, BookOpen, CalendarDays, Grid2X2, UserRound } from 'lucide-react-native'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Screen } from '@/components/ui/Screen'
import { LoadingView } from '@/components/ui/StateViews'
import { CalendarScreen } from '@/features/calendar/CalendarScreen'
import { DashboardScreen } from '@/features/dashboard/DashboardScreen'
import { LibraryScreen } from '@/features/library/LibraryScreen'
import { NotificationsScreen } from '@/features/notifications/NotificationsScreen'
import { ProfileScreen } from '@/features/profile/ProfileScreen'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { colors } from '@/theme/colors'
import { spacing } from '@/theme/spacing'

SplashScreen.preventAutoHideAsync().catch(() => null)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
})

type TabId = 'dashboard' | 'calendar' | 'library' | 'notifications' | 'profile'

const tabs: Array<{ id: TabId; label: string; icon: typeof Grid2X2 }> = [
  { id: 'dashboard', label: 'Home', icon: Grid2X2 },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'notifications', label: 'Alerts', icon: Bell },
  { id: 'profile', label: 'Profile', icon: UserRound },
]

function LoginView() {
  const { login, register, isSubmitting, error, clearError } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async () => {
    if (mode === 'login') {
      await login({ email: email.trim(), password })
      return
    }

    await register({ name: name.trim(), email: email.trim(), password })
  }

  const isDisabled = mode === 'register' ? !name || !email || !password : !email || !password

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.brand}>Lumina</Text>
          <Text style={styles.subtitle}>Your study calendar, library, reminders, and profile built for mobile.</Text>
        </View>

        <View style={styles.switchRow}>
          {(['login', 'register'] as const).map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                clearError()
                setMode(item)
              }}
              style={[styles.switchButton, mode === item && styles.switchButtonActive]}
            >
              <Text style={[styles.switchText, mode === item && styles.switchTextActive]}>
                {item === 'login' ? 'Sign in' : 'Register'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          {mode === 'register' ? (
            <Input label="Name" value={name} onChangeText={(value) => { clearError(); setName(value) }} />
          ) : null}
          <Input
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={(value) => {
              clearError()
              setEmail(value)
            }}
          />
          <Input
            label="Password"
            secureTextEntry
            value={password}
            onChangeText={(value) => {
              clearError()
              setPassword(value)
            }}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button
            label={mode === 'login' ? 'Sign in' : 'Create account'}
            loading={isSubmitting}
            disabled={isDisabled}
            onPress={submit}
          />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  )
}

function MobileShell() {
  const { user, isBootstrapping } = useAuth()
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  usePushNotifications(Boolean(user))

  useEffect(() => {
    if (!isBootstrapping) {
      SplashScreen.hideAsync().catch(() => null)
    }
  }, [isBootstrapping])

  if (isBootstrapping) return <LoadingView />
  if (!user) return <LoginView />

  const activeScreen = {
    dashboard: <DashboardScreen />,
    calendar: <CalendarScreen />,
    library: <LibraryScreen />,
    notifications: <NotificationsScreen />,
    profile: <ProfileScreen />,
  }[activeTab]

  return (
    <View style={styles.shell}>
      <View style={styles.screenSlot}>{activeScreen}</View>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === activeTab
          const color = isActive ? colors.primary : colors.tabInactive

          return (
            <Pressable key={tab.id} style={styles.tabButton} onPress={() => setActiveTab(tab.id)}>
              <Icon color={color} size={22} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <MobileShell />
      </AuthProvider>
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  shell: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenSlot: {
    flex: 1,
  },
  tabBar: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingBottom: 18,
    paddingTop: 8,
  },
  tabButton: {
    minWidth: 58,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    color: colors.tabInactive,
    fontSize: 12,
    fontWeight: '700',
  },
  tabLabelActive: {
    color: colors.primary,
  },
  hero: {
    paddingTop: spacing.xxl,
    gap: spacing.sm,
  },
  brand: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 24,
  },
  switchRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    padding: 4,
  },
  switchButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  switchButtonActive: {
    backgroundColor: colors.surface,
  },
  switchText: {
    color: colors.textMuted,
    fontWeight: '800',
  },
  switchTextActive: {
    color: colors.text,
  },
  form: {
    gap: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
})
