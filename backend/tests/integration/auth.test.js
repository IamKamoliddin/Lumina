import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../../src/app.js'

const parseCookieHeader = (headers) =>
  headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

test('protected routes reject unauthenticated requests', async () => {
  const server = app.listen(0)
  const address = server.address()

  const response = await fetch(`http://127.0.0.1:${address.port}/api/books`)
  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.error.code, 'AUTH_REQUIRED')

  server.close()
})

test('login sets cookies and exposes current user through /me', async () => {
  const server = app.listen(0)
  const address = server.address()

  const loginResponse = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: 'demo@lumina.app',
      password: 'LuminaDemo123',
    }),
  })

  const loginPayload = await loginResponse.json()
  const cookieHeader = parseCookieHeader(loginResponse.headers)

  assert.equal(loginResponse.status, 200)
  assert.equal(loginPayload.user.email, 'demo@lumina.app')
  assert.ok(cookieHeader.includes('lumina_access='))
  assert.ok(cookieHeader.includes('lumina_refresh='))

  const meResponse = await fetch(`http://127.0.0.1:${address.port}/api/auth/me`, {
    headers: {
      cookie: cookieHeader,
    },
  })
  const mePayload = await meResponse.json()

  assert.equal(meResponse.status, 200)
  assert.equal(mePayload.user.id, 'demo-user-id')

  server.close()
})

test('invalid credentials are rejected', async () => {
  const server = app.listen(0)
  const address = server.address()

  const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: 'demo@lumina.app',
      password: 'wrong-password',
    }),
  })
  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.error.code, 'INVALID_CREDENTIALS')

  server.close()
})

test('logout clears session cookies and blocks protected routes afterwards', async () => {
  const server = app.listen(0)
  const address = server.address()

  const loginResponse = await fetch(`http://127.0.0.1:${address.port}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      email: 'demo@lumina.app',
      password: 'LuminaDemo123',
    }),
  })

  const cookieHeader = parseCookieHeader(loginResponse.headers)

  const logoutResponse = await fetch(`http://127.0.0.1:${address.port}/api/auth/logout`, {
    method: 'POST',
    headers: {
      cookie: cookieHeader,
    },
  })

  assert.equal(logoutResponse.status, 204)

  const meResponse = await fetch(`http://127.0.0.1:${address.port}/api/auth/me`, {
    headers: {
      cookie: cookieHeader,
    },
  })
  const mePayload = await meResponse.json()

  assert.equal(meResponse.status, 401)
  assert.equal(mePayload.error.code, 'INVALID_TOKEN')

  server.close()
})
