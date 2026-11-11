# F08: Control Panel: wallpaper, themes, sounds, accessibility

**Phase 5** · Size **M** · Agent ~3–4h · Review ~30 min · Depends on: R05, F07 (screensaver tab) · Touches: new `src/components/ControlPanel.vue`, new `src/composables/useSettings.js`, `src/styles/win2000.css` (theme vars), `App.vue`, `WinTaskbar.vue` (Start menu entry), new `public/sounds/`

## Why
Personalisation is a big part of the nostalgia, and it's the right home for accessibility options (the CRT readability issue in KNOWN_ISSUES).

## Steps
1. Win95 Control Panel window (an icon grid). Each applet opens a property sheet with tabs and OK / Cancel / Apply:
   - **Display**: wallpaper (current + 3–4 original options: "Neon Night", "Rainy Alley", "Teal Classic", solid colour picker), screensaver choice and wait time (F07), colour scheme (the current purple/VA-11 tokens, "Windows Standard" grey/teal, "High Contrast").
   - **Sounds**: master toggle (**off by default**), with original short UI sounds for startup (after BIOS), window open, error ding and achievement. Synthesise them with the WebAudio API, or include tiny original WAVs. **No Microsoft sound files.**
   - **Accessibility**: CRT overlay on/off, scanline intensity, larger text (scale the root font +2px), reduce motion (overrides animations; also honours the OS setting).
   - **Regional**: language (moves the existing toggle here too), show local time next to JST.
2. `useSettings()` reactive store persisted via B06. Themes switch CSS variables on `:root` with a `data-theme` attribute.
3. Start menu → "Settings" → "Control Panel".

## Acceptance criteria
- [ ] All settings persist and apply live
- [ ] High Contrast passes WCAG AA for body text (spot-check 3 screens)
- [ ] Sounds stay silent until explicitly enabled
