import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { register, login, me } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

// Stricter limit for login/register to slow down password guessing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again later.' },
})

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.get('/me', authenticate, me)

export default router