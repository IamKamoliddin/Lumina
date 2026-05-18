import { useState } from 'react'
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'
import { useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Screen } from '@/components/ui/Screen'
import { colors } from '@/theme/colors'
import { spacing } from '@/theme/spacing'

export default function LoginScreen() {
  const { login, isSubmitting, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = async () => {
    await login({ email: email.trim(), password })
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.hero}>
          <Text style={styles.brand}>Lumina</Text>
          <Text style={styles.subtitle}>Your study dashboard, library, calendar, and reminders in your pocket.</Text>
        </View>

        <View style={styles.form}>
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
          <Button label="Sign in" loading={isSubmitting} disabled={!email || !password} onPress={submit} />
        </View>

        <Text style={styles.footer}>
          New to Lumina? <Link href="/(auth)/register" style={styles.link}>Create an account</Link>
        </Text>
      </Screen>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
  form: {
    gap: spacing.lg,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 15,
  },
  link: {
    color: colors.primary,
    fontWeight: '900',
  },
})
