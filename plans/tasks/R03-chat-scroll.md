# R03: Chat: cheap watcher + don't yank the scroll

**Phase 3** · Size **S** · Agent ~45 min · Review ~10 min · Depends on: none · Touches: `src/components/ChatWindow.vue`, `src/composables/useChat.js`

## Why
- `watch(messages, ..., { deep: true })` deep-walks up to 500 message objects on every change.
- It always scrolls to the bottom, so reading history gets interrupted by every new message.
- `useChat.js` adds a new `beforeunload` listener every time the socket is recreated.
- `chat:history` uses `pool.connect().then(...)` with no `.catch` server-side, so if the DB is down that's an unhandled rejection. Fix this in `server/routes/chat.js`.

## Steps
1. Watch `messages.value.length` (or the last id) instead of deep.
2. Auto-scroll only if the user was within ~40 px of the bottom. Otherwise show a Win95-style "▼ New messages" button at the bottom of the pane.
3. Register `beforeunload` once (module level) and remove it in `disconnectSocket`.
4. Add a `.catch` on the history fetch.

## Acceptance criteria
- [ ] Scrolled up in history, a new message arrives: no jump, the "New messages" button appears
- [ ] At the bottom: auto-scrolls as before
