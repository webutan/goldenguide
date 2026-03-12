import pool from '../db.js'

const HISTORY_LIMIT = 100
const PRUNE_LIMIT = 500
const RATE_LIMIT_MS = 1000

function pruneOldMessages(client) {
  return client.query(`
    DELETE FROM chat_messages
    WHERE id NOT IN (
      SELECT id FROM chat_messages ORDER BY id DESC LIMIT $1
    )
  `, [PRUNE_LIMIT])
}

async function getHistory(client) {
  const { rows } = await client.query(`
    SELECT id, nickname, message, created_at
    FROM chat_messages
    ORDER BY id DESC
    LIMIT $1
  `, [HISTORY_LIMIT])
  return rows.reverse()
}

function broadcastCheckins(ns) {
  const list = []
  for (const [, s] of ns.sockets) {
    if (s.data.checkedInBarId) {
      list.push({
        nickname: s.data.checkinNickname || 'Guest',
        barId: s.data.checkedInBarId,
        barName: s.data.checkedInBarName || '',
      })
    }
  }
  ns.emit('checkin:list', list)
}

export function registerChatNamespace(io) {
  const chat = io.of('/chat')
  const lastMessageTime = new Map()

  chat.on('connection', (socket) => {
    const ip = socket.handshake.headers['x-real-ip'] || socket.handshake.address

    // Send history on connect
    pool.connect().then(async (client) => {
      try {
        const history = await getHistory(client)
        socket.emit('chat:history', history)
      } catch (err) {
        console.error('Chat history error:', err.message)
      } finally {
        client.release()
      }
    })

    // Send current checkin list to new connection
    broadcastCheckins(chat)

    // Broadcast updated user count
    const userCount = () => chat.emit('chat:usercount', chat.sockets.size)
    userCount()

    socket.on('disconnect', () => {
      lastMessageTime.delete(socket.id)
      userCount()
      broadcastCheckins(chat)
    })

    socket.on('checkin:set', ({ barId, barName, nickname }) => {
      if (typeof barId !== 'number' && barId !== null) return
      socket.data.checkedInBarId = barId || null
      socket.data.checkedInBarName = typeof barName === 'string' ? barName.slice(0, 100) : null
      socket.data.checkinNickname = typeof nickname === 'string' ? nickname.trim().slice(0, 30) : 'Guest'
      broadcastCheckins(chat)
    })

    socket.on('chat:send', async ({ nickname, message }) => {
      // Input validation
      if (typeof nickname !== 'string' || typeof message !== 'string') return
      const nick = nickname.trim().slice(0, 30)
      const msg = message.trim().slice(0, 500)
      if (!nick || !msg) return

      // Rate limiting: 1 message per second per socket
      const now = Date.now()
      const last = lastMessageTime.get(socket.id) || 0
      if (now - last < RATE_LIMIT_MS) return
      lastMessageTime.set(socket.id, now)

      const client = await pool.connect()
      try {
        const { rows } = await client.query(
          `INSERT INTO chat_messages (nickname, message) VALUES ($1, $2) RETURNING id, nickname, message, created_at`,
          [nick, msg]
        )
        const saved = rows[0]
        chat.emit('chat:message', saved)
        await pruneOldMessages(client)
      } catch (err) {
        console.error('Chat save error:', err.message)
      } finally {
        client.release()
      }
    })
  })

  return chat
}
