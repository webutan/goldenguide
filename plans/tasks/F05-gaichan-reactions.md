# F05: Gai-chan reacts to what you do + Rules Quiz certificate

**Phase 5** · Size **M–L** · Agent ~4–5h · Review ~40 min · Depends on: B02, F01 nice-to-have · Touches: `GaiChanDialogue.vue`, `GaiChan.vue`, new `src/composables/useGaiChanEvents.js`, `App.vue`, `useI18n.js` (or a new dialogue strings file)

## Why
Gai-chan is the site's personality, but after onboarding she's passive. Small, well-timed reactions make the site feel alive and reinforce the local rules, which is the community-friendly angle the area cares about.

## Steps
1. An event bus composable: `emitGaiChan(event, payload)`. App and components emit `checked-in`, `visited`, `favorited`, `achievement`, `late-night`, `filter-empty`, `idle`.
2. Reaction rules (data-driven table: event → condition → lines EN/JP → expression sprite or 3D pose):
   - Check-in: "Kanpai! Remember: no photos of other guests."
   - First visit to a 2F bar: "Mind the stairs, they're steep!"
   - 23:50 JST: "Last trains leave soon! JR Yamanote ~00:20 from Shinjuku." Make the times configurable constants, phrased as approximate.
   - 02:00+: "Most bars are winding down. Be quiet in the alleys."
   - Filters return 0 bars: "Nothing matches… try removing a tag?"
   - Closing soon (≤30 min, from B02's `minutesUntilClose`) when a bar card is opened.

   Show these in the tucked panel's speech balloon, never as modals. Rate-limit to at most 1 per 3 min. Add "Mute Gai-chan" to her context menu, persisted.
3. **Rules Quiz:** after the walkthrough (or from her menu), 6–8 multiple-choice questions from `goldengairules.txt` (smoking, photos, charge, noise…) in the CRT terminal style. Passing shows a printable/shareable Win95 "Certificate of Golden Gai Etiquette" with the user's nickname, the date and a hanko (reuse F01's stamp renderer if present). Unlocks the "Rule Abider" achievement.

## Acceptance criteria
- [ ] Each reaction can be triggered (dev helper `window.__gaichan('late-night')` in dev only)
- [ ] Mute works and persists
- [ ] Quiz is fully bilingual and the certificate renders on mobile
