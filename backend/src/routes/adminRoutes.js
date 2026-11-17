import { Router } from 'express'
import { authenticate, authorize } from '../middleware/auth.js'
import { getStats, listHospitals, verifyHospital } from '../controllers/adminController.js'

const router = Router()

// Every admin route requires a logged-in admin
router.use(authenticate, authorize('admin'))

router.get('/stats', getStats)
router.get('/hospitals', listHospitals)
router.patch('/hospitals/:userId/verify', verifyHospital)

export default router