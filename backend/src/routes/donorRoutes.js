import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { updateProfile } from '../controllers/donorController.js'
import { listMyRequests, respond } from '../controllers/donorRequestsController.js'

const router = Router()

// Every donor route requires a logged-in donor account
router.use(authenticate, authorize('donor'))

router.put('/profile', updateProfile)
router.get('/requests', listMyRequests)
router.post('/requests/:requestId/respond', respond)

export default router