import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import healthRoutes from './routes/healthRoutes.js'
import authRoutes from './routes/authRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import donorRoutes from './routes/donorRoutes.js'
import hospitalRoutes from './routes/hospitalRoutes.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security and basic setup
app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL }))
app.use(express.json())

// Rate limiting: max 200 requests per 15 minutes per IP
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
)

// Routes
app.use('/api/health', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/donor', donorRoutes)
app.use('/api/hospital', hospitalRoutes)

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

app.listen(PORT, () => {
  console.log(`BloodLink API running on http://localhost:${PORT}`)
})