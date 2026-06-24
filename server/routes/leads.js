import { Router } from 'express'
import { crmStore } from '../data/store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth)

// GET /api/leads — all roles
router.get('/', async (req, res) => {
  const data = await crmStore.get()
  res.json(data.leads)
})

// POST /api/leads — admin + editor
router.post('/', requireRole('admin', 'editor'), async (req, res) => {
  const data = await crmStore.get()
  const lead = {
    ...req.body,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    createdBy: req.user.username,
  }
  data.leads = [lead, ...data.leads]
  await crmStore.save(data)
  res.status(201).json(lead)
})

// PUT /api/leads/:id — admin + editor
router.put('/:id', requireRole('admin', 'editor'), async (req, res) => {
  const data = await crmStore.get()
  const idx = data.leads.findIndex(l => l.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Lead not found' })
  data.leads[idx] = { ...data.leads[idx], ...req.body, id: req.params.id }
  await crmStore.save(data)
  res.json(data.leads[idx])
})

// DELETE /api/leads/:id — admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  const data = await crmStore.get()
  const before = data.leads.length
  data.leads = data.leads.filter(l => l.id !== req.params.id)
  if (data.leads.length === before) return res.status(404).json({ error: 'Lead not found' })
  await crmStore.save(data)
  res.json({ ok: true })
})

export default router
