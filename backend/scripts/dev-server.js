import { spawn, spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(__dirname, '..')
const envPath = path.join(backendRoot, '.env')

const readPort = () => {
  const envPort = process.env.PORT
  if (envPort) return envPort

  if (!existsSync(envPath)) return '4000'

  const match = readFileSync(envPath, 'utf8').match(/^PORT=(.+)$/m)
  return match?.[1]?.trim() || '4000'
}

const port = readPort()

const findListeningPids = () => {
  const result = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], {
    encoding: 'utf8',
  })

  if (result.status !== 0 && !result.stdout) return []

  return result.stdout
    .split('\n')
    .map((pid) => pid.trim())
    .filter(Boolean)
    .filter((pid) => pid !== String(process.pid))
}

const getProcessGroupId = (pid) => {
  const result = spawnSync('ps', ['-o', 'pgid=', '-p', pid], {
    encoding: 'utf8',
  })

  return result.stdout.trim()
}

const stopExistingServer = () => {
  const pids = findListeningPids()
  if (pids.length === 0) return

  console.log(`[lumina-api] Port ${port} is busy. Stopping old listener: ${pids.join(', ')}`)

  for (const pid of pids) {
    try {
      const groupId = getProcessGroupId(pid)
      if (groupId) {
        process.kill(-Number(groupId), 'SIGTERM')
      } else {
        process.kill(Number(pid), 'SIGTERM')
      }
    } catch (error) {
      console.warn(`[lumina-api] Could not stop process ${pid}: ${error.message}`)
    }
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (findListeningPids().length === 0) return
    spawnSync('sleep', ['0.1'])
  }

  console.warn(`[lumina-api] Port ${port} is still busy; starting anyway so Node can report the error.`)
}

stopExistingServer()

const server = spawn(process.execPath, ['--watch', 'src/server.js'], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: process.env,
})

const forwardSignal = (signal) => {
  if (!server.killed) server.kill(signal)
}

process.on('SIGINT', () => forwardSignal('SIGINT'))
process.on('SIGTERM', () => forwardSignal('SIGTERM'))

server.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  process.exit(code ?? 0)
})
