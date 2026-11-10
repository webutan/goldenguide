# R03: Chat: cheap watcher + don't yank the scroll

**Phase 3** · Size **S** · Agent ~45 min · Review ~10 min · Depends on: none · Touches: `src/components/ChatWindow.vue`, `src/composables/useChat.js`

## Why
- `watch(messages, ..., { deep: true })` deep-walks up to 500 message objects on every change.
- It always scrolls to the bottom, so reading history gets interrupted by every new message.
- `useChat.js` adds a new `beforeunload` listener every time the socket is recreated.
- `chat:history` uses `pool.connect().then(...)` with no `.catch` server-side, so if the DB is down that's an unhandled rejection. Fix this in `server/routes/chat.js`.

Also (found in R06): `ReviewDialog.vue` calls `useChat()` only to read the nickname, which opens a chat socket (and downloads socket.io) whenever a review dialog is open. Export a socket-free `useNickname()` (or read via `readString`) and use it there.

Also (found in B08, small UI bugs in the same area, fix here):
- `BarTwitterPanel.vue` throws `Cannot read properties of undefined (reading 'length')` when the feed response has no `tweets` field. Guard `tweets == null`.
- `ReviewDialog.vue`: the canvas black fill in `onMounted` never runs because the canvas only exists in the 'write' phase. Fill it when that phase starts.

## Steps
1. Watch `messages.value.length` (or the last id) instead of deep.
2. Auto-scroll only if the user was within ~40 px of the bottom. Otherwise show a Win95-style "▼ New messages" button at the bottom of the pane.
3. Register `beforeunload` once (module level) and remove it in `disconnectSocket`.
4. Add a `.catch` on the history fetch.

## Acceptance criteria
- [ ] Scrolled up in history, a new message arrives: no jump, the "New messages" button appears
- [ ] At the bottom: auto-scrolls as before
