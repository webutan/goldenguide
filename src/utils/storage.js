// Safe wrappers around localStorage.
//
// localStorage can throw on access (Safari private mode, blocked site data,
// quota exceeded) and stored values can be corrupted. None of that should
// ever break the app, so every helper here swallows errors and falls back.

function getStore() {
  // Accessing the property itself can throw, so it lives inside the callers' try.
  return globalThis.localStorage
}

/**
 * Read and JSON-parse a value.
 * Returns `fallback` if the key is missing, storage is unavailable, the value
 * is not valid JSON, or `validate(value)` returns false. Corrupt or invalid
 * values are removed so they don't fail again on the next load.
 */
export function readJSON(key, fallback, validate) {
  let raw
  try {
    raw = getStore().getItem(key)
  } catch {
    return fallback
  }
  if (raw === null || raw === undefined) return fallback
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    remove(key)
    return fallback
  }
  if (validate && !validate(value)) {
    remove(key)
    return fallback
  }
  return value
}

/** JSON-stringify and store a value. Returns true on success. */
export function writeJSON(key, value) {
  try {
    getStore().setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

/** Read a raw string. Returns `fallback` if missing or storage is unavailable. */
export function readString(key, fallback = null) {
  try {
    const raw = getStore().getItem(key)
    return raw === null || raw === undefined ? fallback : raw
  } catch {
    return fallback
  }
}

/** Store a raw string. Returns true on success. */
export function writeString(key, value) {
  try {
    getStore().setItem(key, String(value))
    return true
  } catch {
    return false
  }
}

/** Remove a key. Never throws. */
export function remove(key) {
  try {
    getStore().removeItem(key)
  } catch {
    /* storage blocked */
  }
}

// Shape validators for readJSON
export const isNumberArray = v => Array.isArray(v) && v.every(n => typeof n === 'number' && Number.isFinite(n))
export const isStringArray = v => Array.isArray(v) && v.every(s => typeof s === 'string')
export const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v)
