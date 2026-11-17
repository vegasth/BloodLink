import { Router } from 'express'
import pool from '../config/db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BloodLink API',
    time: new Date().toISOString(),
  })
})

// Checks that the backend can reach the database
router.get('/db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now')
    res.json({ status: 'ok', database: 'connected', time: result.rows[0].now })
  } catch (err) {
    // Details go to the server terminal only, never to the browser
    console.error('Database check failed:', err.message)
    res.status(500).json({ status: 'error', database: 'not reachable' })
  }
})

export default router