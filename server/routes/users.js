import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { usersStore } from '../data/store.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()
router.use(requireAuth, requireRole('admin'))

const VALID_ROLES = ['admin', 'editor', 'readonly']
const safe = u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })

// GET /api/users
router.get('/', async (req, res) => {
  const users = await usersStore.getAll()
  res.json(users.map(safe))
})

// POST /api/users — create new user
router.post('/', async (req, res) => {
  const { username, password, role } = req.body || {}
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'username, password and role are required' })
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  const users = await usersStore.getAll()
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already exists' })
  }
  const user = {
    id: Date.now().toString(),
    username,
    passwordHash: await bcrypt.hash(password, 12),
    role,
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  await usersStore.save(users)
  res.status(201).json(safe(user))
})

// PUT /api/users/:id — update role or reset password
router.put('/:id', async (req, res) => {
  const { role, password, username } = req.body || {}
  const users = await usersStore.getAll()
  const user = users.find(u => u.id === req.params.id)
  if (!user) return res.status(404).json({ error: 'User not found' })

  if (role) {
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` })
    }
    user.role = role
  }
  if (username) {
    if (users.find(u => u.username === username && u.id !== req.params.id)) {
      return res.status(409).json({ error: 'Username already taken' })
    }
    user.username = username
  }
  if (password) {
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }
    user.passwordHash = await bcrypt.hash(password, 12)
  }
  await usersStore.save(users)
  res.json(safe(user))
})

// DELETE /api/users/:id
router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' })
  }
  const users = await usersStore.getAll()
  const filtered = users.filter(u => u.id !== req.params.id)
  if (filtered.length === users.length) return res.status(404).json({ error: 'User not found' })
  await usersStore.save(filtered)
  res.json({ ok: true })
})

export default router
