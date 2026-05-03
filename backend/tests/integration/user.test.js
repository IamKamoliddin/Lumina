import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../../src/app.js'

const loginAndGetCookies = async (port, email = 'demo@lumina.app', password = 'LuminaDemo123') => {
  const response = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const cookies = response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

  return { response, cookies }
}

test('profile endpoint returns safe user profile data', async () => {
  const server = app.listen(0)
  const { port } = server.address()
  const { cookies } = await loginAndGetCookies(port)

  const response = await fetch(`http://127.0.0.1:${port}/api/user/profile`, {
    headers: {
      cookie: cookies,
    },
  })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.user.email, 'demo@lumina.app')
  assert.ok('created_at' in payload.user)

  server.close()
})

test('profile update persists name and profile picture url', async () => {
  const server = app.listen(0)
  const { port } = server.address()
  const { cookies } = await loginAndGetCookies(port)

  const response = await fetch(`http://127.0.0.1:${port}/api/user/profile`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: cookies,
    },
    body: JSON.stringify({
      name: 'Demo Student',
      profile_picture_url: 'https://example.com/avatar.png',
    }),
  })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.user.name, 'Demo Student')
  assert.equal(payload.user.profile_picture_url, 'https://example.com/avatar.png')

  server.close()
})

test('email change enforces update and returns new email', async () => {
  const server = app.listen(0)
  const { port } = server.address()

  const registerResponse = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Second User',
      email: 'second@lumina.app',
      password: 'SecondUser123',
    }),
  })

  const secondUserCookies = registerResponse.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

  const response = await fetch(`http://127.0.0.1:${port}/api/user/change-email`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: secondUserCookies,
    },
    body: JSON.stringify({
      email: 'updated@lumina.app',
    }),
  })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.user.email, 'updated@lumina.app')
  assert.equal(payload.verification_recommended, true)

  server.close()
})

test('password change requires current password and invalidates current session', async () => {
  const server = app.listen(0)
  const { port } = server.address()

  const registerResponse = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Password User',
      email: 'password@lumina.app',
      password: 'PasswordUser123',
    }),
  })

  const cookies = registerResponse.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')

  const response = await fetch(`http://127.0.0.1:${port}/api/user/change-password`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json',
      cookie: cookies,
    },
    body: JSON.stringify({
      current_password: 'PasswordUser123',
      new_password: 'PasswordUser456',
      confirm_password: 'PasswordUser456',
    }),
  })
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.match(payload.message, /Password updated successfully/i)

  const meResponse = await fetch(`http://127.0.0.1:${port}/api/auth/me`, {
    headers: {
      cookie: cookies,
    },
  })

  assert.equal(meResponse.status, 401)

  const relogin = await loginAndGetCookies(port, 'password@lumina.app', 'PasswordUser456')
  assert.equal(relogin.response.status, 200)

  server.close()
})
