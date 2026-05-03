import test from 'node:test'
import assert from 'node:assert/strict'
import app from '../../src/app.js'

test('app exposes a health route', async () => {
  const server = app.listen(0)
  const address = server.address()
  const response = await fetch(`http://127.0.0.1:${address.port}/health`)
  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.status, 'ok')

  server.close()
})
