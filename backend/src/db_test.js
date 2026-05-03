import { pool } from './db/pool.js'

const testConnection = async () => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result')
    console.log('Connection successful:', rows[0].result)
    process.exit(0)
  } catch (err) {
    console.error('Connection failed:', err)
    process.exit(1)
  }
}

testConnection()

