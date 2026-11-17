import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import {
  updateProfile,
  createRequest,
  listRequests,
  cancelRequest,
  updateProgress,
} from '../controllers/hospitalController.js'
import {
  runMatching,
  listResponses,
  updateResponseStatus,
} from '../controllers/matchingController.js'

const router = Router()

// Every hospital route requires a logged-in hospital account
router.use(authenticate, authorize('hospital'))

router.put('/profile', updateProfile)
router.post('/requests', createRequest)
router.get('/requests', listRequests)
router.post('/requests/:id/cancel', cancelRequest)
router.patch('/requests/:id/progress', updateProgress)
router.post('/requests/:id/match', runMatching)
router.get('/requests/:id/responses', listResponses)
router.patch('/requests/:id/responses/:donorId', updateResponseStatus)

export default router