import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { usersStore } from '../data/store.js'
import { requireAuth, signToken } from '../middleware/auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' })
  }
  const users = await usersStore.getAll()
  const user = users.find(u => u.username === username)
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }
  const token = signToken({ id: user.id, username: user.username, role: user.role })
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } })
})

// GET /api/auth/me — validate token + return current user
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Both passwords required' })
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' })
  }
  const users = await usersStore.getAll()
  const user = users.find(u => u.id === req.user.id)
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }
  user.passwordHash = await bcrypt.hash(newPassword, 12)
  await usersStore.save(users)
  res.json({ ok: true })
})

export default router
