import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes     from './routes/auth.js'
import leadsRoutes    from './routes/leads.js'
import settingsRoutes from './routes/settings.js'
import usersRoutes    from './routes/users.js'
import { initData }   from './data/store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app  = express()
const PORT = process.env.PORT || 3001

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',     authRoutes)
app.use('/api/leads',    leadsRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/users',    usersRoutes)

// ── Serve built React app in production ──────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist')
  app.use(express.static(distPath))
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')))
}

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

// ── Boot ──────────────────────────────────────────────────────────────────────
await initData()
app.listen(PORT, () => {
  console.log(`IPSIQ CRM server running on http://localhost:${PORT}`)
})
