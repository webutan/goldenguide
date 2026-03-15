import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { Server as SocketIOServer } from 'socket.io'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { runMigrations } from './migrate.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '..', '.env') })

import barsRouter from './routes/bars.js'
import tagsRouter from './routes/tags.js'
import photosRouter from './routes/photos.js'
import annotationsRouter from './routes/annotations.js'
import feedRouter from './routes/feed.js'
import reviewsRouter from './routes/reviews.js'
import partitionsRouter from './routes/partitions.js'
import { registerChatNamespace } from './routes/chat.js'
import admin from './middleware/admin.js'

const app = express()
const httpServer = createServer(app)
const PORT = process.env.PORT || 3001

const allowedOrigin = process.env.CORS_ORIGIN || '*'

const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigin },
  path: '/socket.io',
})

app.use(cors({ origin: allowedOrigin }))
app.use(express.json())

const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 })

// Static file serving for uploaded photos
app.use('/uploads', express.static(resolve(__dirname, 'uploads')))

// Admin auth check
app.get('/api/admin/check', adminLimiter, admin, (req, res) => res.json({ ok: true }))

// API routes
app.use('/api/bars', barsRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/annotations', annotationsRouter)
app.use('/api/feed', feedRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/partitions', partitionsRouter)
app.use('/api', photosRouter)

// Socket.io chat namespace
registerChatNamespace(io)

// Run migrations then start server
runMigrations()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Golden Gai API running on http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('Migration failed, aborting startup:', err.message)
    process.exit(1)
  })
