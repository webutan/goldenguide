# R05: Win95 dialog system (replace alert/confirm/prompt)

**Phase 3** (pull earlier if convenient; many features use it) · Size **M** · Agent ~2–3h · Review ~20 min · Depends on: none · Touches: new `src/components/win2000/WinDialog.vue`, new `src/composables/useDialog.js`, `App.vue` (mount point), `useAdmin.js`, `AdminPanel.vue`, `DatabaseTable.vue`

## Why
The admin login uses `window.prompt` (which shows the password in plain text) and `window.alert`. Deletes use `confirm()`. These break the illusion, and the native prompt can't mask input. Upcoming features (Roulette, Passport, suggestions, moderation) need consistent modal dialogs.

## Steps
1. `WinDialog.vue`: a classic Win95 message box. Title bar with ✕, a 32 px icon (info / warning / error / question; reuse `public/icons/msg_error-1.png` and add 3 pixel icons if needed), the message, buttons (OK / Cancel / Yes / No), and an optional input (`type="password"` supported). Keyboard: Enter = default button, Esc = cancel, focus trapped. Plays nicely with the window manager's z-index (above windows, below the BIOS).
2. `useDialog()` returns promise-based `alert(msg, opts)`, `confirm(msg, opts) → boolean`, `prompt(msg, { password, default }) → string|null`. It's a singleton queue with one host component mounted in `App.vue`.
3. Replace every `window.alert/confirm/prompt` in `src/`.
4. Optional: a "ding" sound hook that F08's sound setting can enable later (no sound by default).

## Acceptance criteria
- [ ] `grep -rnE "window\.(alert|confirm|prompt)|[^.]confirm\(" src` → none
- [ ] The admin password is masked
- [ ] Works on mobile: centred, buttons ≥ 40 px
- [ ] Screenshot of each variant
