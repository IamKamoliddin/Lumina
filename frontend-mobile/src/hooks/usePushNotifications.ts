import { useEffect, useState } from 'react'
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export function usePushNotifications(enabled: boolean) {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    const register = async () => {
      const existing = await Notifications.getPermissionsAsync()
      const finalStatus =
        existing.status === 'granted'
          ? existing.status
          : (await Notifications.requestPermissionsAsync()).status

      if (finalStatus !== 'granted') return

      const token = await Notifications.getExpoPushTokenAsync()
      setExpoPushToken(token.data)
    }

    register().catch(() => null)
  }, [enabled])

  return expoPushToken
}
