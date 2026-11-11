# B06: Safe localStorage helper

**Phase 1** · Size **S** · Agent ~1h · Review ~10 min · Depends on: none · Touches: new `src/utils/storage.js`, `App.vue`, `useVisited.js`, `useChat.js`, `ChatWindow.vue`, any other `localStorage` call site

## Why
`App.vue:117` and `:138` run `JSON.parse(localStorage.getItem(...))` at setup with no try/catch. One corrupted value (or Safari private mode throwing on access) blanks the entire app. `useChat.js` reads localStorage at module load.

## Steps
1. `src/utils/storage.js`: `readJSON(key, fallback)`, `writeJSON(key, value)`, `readString(key, fallback)`, `writeString(key, value)`, `remove(key)`. All wrapped in try/catch; on parse failure, remove the bad key and return the fallback.
2. Replace every direct `localStorage` call in `src/` (find them with `grep -rn localStorage src`). Keep the existing key names so users keep their data.
3. Validate shapes: visited/favorites must be arrays of numbers, partitions an object, tag order an array of strings.

## Acceptance criteria
- [ ] `grep -rn "localStorage\." src` only matches inside `storage.js`
- [ ] Manually setting `golden-gai-partitions` to `"{bad"` and reloading: the app loads normally
- [ ] Existing favourites, visited, lang, nickname and label mode survive the change
