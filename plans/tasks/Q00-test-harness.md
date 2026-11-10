# Q00: Add a test harness (Vitest)

**Phase 1** · Size **S** · Agent ~1h · Your review ~15 min · Depends on: none · Touches: `package.json`, new `vitest.config.js`, new `tests/`

## Why
There are no tests. Several upcoming fixes (open-now, filters, search normalisation, route planning) are pure logic and easy to break silently. Every later task is expected to add tests here.

## Files
- `package.json`: add `vitest` (devDependency) and an `"test": "vitest run"` script
- `vitest.config.js` (new): reuse the Vue plugin; `environment: 'node'` by default
- `tests/smoke.test.js` (new): one trivial test that imports `src/composables/useI18n.js` and checks `t('search')` in both languages

## Steps
1. `npm i -D vitest@^2` (pick a version compatible with Vite 6).
2. Add the config and the smoke test.
3. Add a short "Testing" section to `PROJECT_GUIDE.md` (§13): `npm test`.

## Acceptance criteria
- [ ] `npm test` runs and passes
- [ ] `npm run build` unaffected
- [ ] No test files end up in `dist/`

## Out of scope
Component and DOM tests, CI wiring (CI can be added later in `.github/workflows/`).
