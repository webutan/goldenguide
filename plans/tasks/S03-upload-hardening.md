# S03: Upload hardening

**Phase 2** · Size **S** · Agent ~1–1.5h · Review ~15 min · Depends on: none · Touches: `server/routes/photos.js`, `server/routes/annotations.js`, `server/package.json`, `server/index.js`, `KNOWN_ISSUES.md`

## Why
Multer keeps the **original extension** (`photos.js:20`, the same in annotations), contrary to `KNOWN_ISSUES.md`, and there's no content check. An uploaded `.html` or `.svg` is served by `express.static` from the site's own origin. It's admin-only, but if the password leaks it becomes stored XSS.

## Steps
1. Use `multer.memoryStorage()`, then check magic bytes (via the `file-type` package, or a small manual check for JPEG/PNG/WebP/GIF). Reject anything else with 415.
2. Derive the extension from the **detected** type. Write the file with a UUID name.
3. Optional (nice): re-encode with `sharp` to strip EXIF/GPS metadata and cap the longest side at 2000 px. Bar photos taken on phones carry GPS.
4. `express.static` for `/uploads`: set `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; img-src 'self'`.
5. Fix the photos `DELETE` path traversal guard: make sure the resolved path stays inside `UPLOADS_DIR`.
6. Update KNOWN_ISSUES.

## Acceptance criteria
- [ ] Uploading a `.html` renamed to `.jpg` → 415
- [ ] A valid JPEG uploads and displays; the stored name ends in `.jpg` regardless of the original name
- [ ] Response headers on `/uploads/...` include `nosniff`
