import { useEffect } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '@/auth/AuthProvider'
import { LoadingView } from '@/components/ui/StateViews'
import { usePushNotifications } from '@/hooks/usePushNotifications'

SplashScreen.preventAutoHideAsync().catch(() => null)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

function SessionGate() {
  const { user, isBootstrapping } = useAuth()
  const segments = useSegments()
  usePushNotifications(Boolean(user))

  useEffect(() => {
    if (isBootstrapping) return

    SplashScreen.hideAsync().catch(() => null)

    const isAuthGroup = segments[0] === '(auth)'

    if (!user && !isAuthGroup) {
      router.replace('/(auth)/login')
    }

    if (user && isAuthGroup) {
      router.replace('/(tabs)/dashboard')
    }
  }, [isBootstrapping, segments, user])

  if (isBootstrapping) return <LoadingView />

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SessionGate />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  )
}
