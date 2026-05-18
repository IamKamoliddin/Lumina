const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL
const API_BASE_URL =
  import.meta.env.PROD && (!configuredApiBaseUrl || configuredApiBaseUrl.includes('localhost'))
    ? ''
    : configuredApiBaseUrl ?? 'http://localhost:4000'

let isRefreshing = false
let refreshSubscribers = []

const onRefreshed = () => {
  refreshSubscribers.forEach((callback) => callback())
  refreshSubscribers = []
}

const addRefreshSubscriber = (callback) => {
  refreshSubscribers.push(callback)
}

export const buildRequestUrl = (path) => `${API_BASE_URL}${path}`
export { API_BASE_URL }

const mapFetchFailureMessage = (error, requestUrl) => {
  const rawMessage = String(error?.message ?? '').toLowerCase()

  if (rawMessage.includes('failed to fetch') || rawMessage.includes('load failed')) {
    return `Unable to reach API at ${requestUrl}. Check backend status, API base URL, and CORS origin settings.`
  }

  if (rawMessage.includes('networkerror')) {
    return `Network error while requesting ${requestUrl}. Verify internet/VPN/firewall and API host reachability.`
  }

  return `Request to ${requestUrl} failed before receiving a response.`
}

export const apiRequest = async (path, options = {}) => {
  const requestUrl = buildRequestUrl(path)
  const executeRequest = async () => {
    const response = await fetch(requestUrl, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...options,
    })

    if (response.status === 204) {
      return null
    }

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      const backendCode = payload?.error?.code ?? payload?.code
      const backendMessage = payload?.error?.message ?? payload?.message
      const isEmptyQueryError =
        backendCode === 'EMPTY_SQL_QUERY' ||
        String(backendMessage ?? '').toLowerCase().includes('emptyquery')
      const message = isEmptyQueryError
        ? 'Login service is temporarily unavailable. Please try again in a moment.'
        : backendMessage ?? 'Request failed'
      const error = new Error(message)
      error.status = response.status
      error.code = backendCode ?? 'REQUEST_FAILED'
      error.payload = payload

      if (isEmptyQueryError) {
        console.error('[apiRequest] backend empty query error', {
          url: requestUrl,
          method: options.method ?? 'GET',
          payload,
          stack: error.stack,
        })
      }
      throw error
    }

    return payload
  }

  try {
    return await executeRequest()
  } catch (error) {
    if (error instanceof TypeError && error.status === undefined) {
      const networkError = new Error(mapFetchFailureMessage(error, requestUrl))
      networkError.code = 'NETWORK_ERROR'
      networkError.cause = error

      console.error('[apiRequest] network failure', {
        url: requestUrl,
        method: options.method ?? 'GET',
        stack: error.stack,
        error,
      })

      throw networkError
    }

    if (error.status === 401 && path !== '/api/auth/login' && path !== '/api/auth/refresh') {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const refreshUrl = buildRequestUrl('/api/auth/refresh')
          const res = await fetch(refreshUrl, {
            method: 'POST',
            credentials: 'include',
          })
          if (!res.ok) throw new Error('Refresh failed')
          
          isRefreshing = false
          onRefreshed()
          return await executeRequest()
        } catch {
          isRefreshing = false
          refreshSubscribers = []
          throw error
        }
      }

      return new Promise((resolve, reject) => {
        addRefreshSubscriber(() => {
          executeRequest().then(resolve).catch(reject)
        })
      })
    }
    throw error
  }
}
