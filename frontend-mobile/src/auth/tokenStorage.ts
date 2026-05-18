import * as SecureStore from 'expo-secure-store'

const accessTokenKey = 'lumina.accessToken'
const refreshTokenKey = 'lumina.refreshToken'

export const tokenStorage = {
  async getAccessToken() {
    return SecureStore.getItemAsync(accessTokenKey)
  },

  async getRefreshToken() {
    return SecureStore.getItemAsync(refreshTokenKey)
  },

  async setTokens(accessToken?: string, refreshToken?: string) {
    if (accessToken) {
      await SecureStore.setItemAsync(accessTokenKey, accessToken)
    }

    if (refreshToken) {
      await SecureStore.setItemAsync(refreshTokenKey, refreshToken)
    }
  },

  async clear() {
    await Promise.all([
      SecureStore.deleteItemAsync(accessTokenKey),
      SecureStore.deleteItemAsync(refreshTokenKey),
    ])
  },
}
