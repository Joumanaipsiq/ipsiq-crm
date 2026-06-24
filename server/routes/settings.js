import { Router } from 'express'
import { crmStore } from '../data/store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/settings — all roles
router.get('/', async (req, res) => {
  const data = await crmStore.get()
  res.json(data.settings)
})

// PUT /api/settings — admin only
router.put('/', requireRole('admin'), async (req, res) => {
  const data = await crmStore.get()
  data.settings = { ...data.settings, ...req.body }
  await crmStore.save(data)
  res.json(data.settings)
})

export default router
