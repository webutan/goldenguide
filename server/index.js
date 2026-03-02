import express from 'express'
import cors from 'cors'
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

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Static file serving for uploaded photos
app.use('/uploads', express.static(resolve(__dirname, 'uploads')))

// API routes
app.use('/api/bars', barsRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/annotations', annotationsRouter)
app.use('/api', photosRouter)

// Run migrations then start server
runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Golden Gai API running on http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('Migration failed, aborting startup:', err.message)
    process.exit(1)
  })
