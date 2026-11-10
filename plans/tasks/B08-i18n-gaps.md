# B08: i18n gaps

**Phase 1** · Size **S** · Agent ~1h · Review ~15 min · Depends on: none · Touches: `src/composables/useI18n.js`, `App.vue`, components with hard-coded strings

## Why
The Explorer's "Favorites" / "Visited" buttons (`App.vue` ~643–647), the mobile "✕ Clear", window titles like "Explorer" / "Admin Console" / "Database", and assorted strings bypass `t()`. The key `'search'` is defined twice in `useI18n.js`.

## Steps
1. Remove the duplicate key.
2. Grep the templates for English literals between tags and in `title=`, `placeholder=` and `alt=` attributes in **user-facing** components (admin-only components can stay English). Move them into `t()`.
3. Window titles registered with `wm.register` should update when the language changes. Generalise the existing `watch(effectiveLang, ...)` that only handles `search`.
4. In dev only, make `t()` `console.warn` on missing keys.

## Acceptance criteria
- [ ] Switching to JP leaves no English on the user-facing desktop, map, directory or windows (screenshot both languages)
- [ ] No duplicate keys
