import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './db/pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, 'db', 'migrations')

const runMigrations = async () => {
  const files = fs.readdirSync(migrationsDir).sort()
  
  for (const file of files) {
    if (!file.endsWith('.sql')) continue
    
    console.log(`Running migration: ${file}`)
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    
    // Split by semicolon but be careful with nested semicolons (not an issue here)
    const statements = sql.split(';').filter(s => s.trim())
    
    for (const statement of statements) {
      try {
        await pool.query(statement)
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME' || error.code === 'ER_DUP_KEYNAME') {
          continue
        }
        throw error
      }
    }
  }
  
  console.log('Migrations completed successfully.')
  process.exit(0)
}

runMigrations().catch(err => {
  if (err.code === 'ER_ACCESS_DENIED_ERROR') {
    console.error('\x1b[31m%s\x1b[0m', '\n[ERROR] MySQL Access Denied.')
    console.error('Please check your DB_PASSWORD in backend/.env.')
    console.error('Also verify DB_USER, DB_HOST, DB_PORT, and DB_NAME for your MySQL instance.\n')
  } else {
    console.error('Migration failed:', err)
  }
  process.exit(1)
})
