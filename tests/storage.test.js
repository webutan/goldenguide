import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  readJSON, writeJSON, readString, writeString, remove,
  isNumberArray, isStringArray, isPlainObject,
} from '../src/utils/storage.js'

function memoryStorage(initial = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: k => (Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v) },
    removeItem: k => { delete data[k] },
  }
}

function installStorage(value) {
  Object.defineProperty(globalThis, 'localStorage', { value, configurable: true, writable: true })
}

function installThrowingGetter() {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new DOMException('The operation is insecure.', 'SecurityError') },
  })
}

let original
beforeEach(() => { original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage') })
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'localStorage', original)
  else delete globalThis.localStorage
})

describe('readJSON', () => {
  it('returns parsed value', () => {
    installStorage(memoryStorage({ k: '{"a":1}' }))
    expect(readJSON('k', {})).toEqual({ a: 1 })
  })

  it('returns fallback when missing', () => {
    installStorage(memoryStorage())
    expect(readJSON('k', [])).toEqual([])
  })

  it('removes corrupt value and returns fallback', () => {
    const s = memoryStorage({ k: '{bad' })
    installStorage(s)
    expect(readJSON('k', { ok: true })).toEqual({ ok: true })
    expect('k' in s.data).toBe(false)
  })

  it('removes value failing validation and returns fallback', () => {
    const s = memoryStorage({ k: '[1,"x"]' })
    installStorage(s)
    expect(readJSON('k', [], isNumberArray)).toEqual([])
    expect('k' in s.data).toBe(false)
  })

  it('keeps value passing validation', () => {
    const s = memoryStorage({ k: '[1,2,3]' })
    installStorage(s)
    expect(readJSON('k', [], isNumberArray)).toEqual([1, 2, 3])
    expect(s.data.k).toBe('[1,2,3]')
  })

  it('returns fallback when localStorage getter throws', () => {
    installThrowingGetter()
    expect(readJSON('k', 'fb')).toBe('fb')
  })

  it('returns fallback when getItem throws', () => {
    installStorage({ getItem() { throw new Error('nope') }, setItem() {}, removeItem() {} })
    expect(readJSON('k', 42)).toBe(42)
  })

  it('returns fallback when localStorage is undefined', () => {
    installStorage(undefined)
    expect(readJSON('k', 'fb')).toBe('fb')
  })
})

describe('writeJSON', () => {
  it('stores stringified value', () => {
    const s = memoryStorage()
    installStorage(s)
    expect(writeJSON('k', { a: [1] })).toBe(true)
    expect(s.data.k).toBe('{"a":[1]}')
  })

  it('returns false instead of throwing on quota/blocked errors', () => {
    installStorage({ getItem: () => null, setItem() { throw new Error('QuotaExceeded') }, removeItem() {} })
    expect(writeJSON('k', 1)).toBe(false)
    installThrowingGetter()
    expect(writeJSON('k', 1)).toBe(false)
  })
})

describe('readString / writeString', () => {
  it('round-trips a string', () => {
    installStorage(memoryStorage())
    expect(writeString('lang', 'jp')).toBe(true)
    expect(readString('lang')).toBe('jp')
  })

  it('returns fallback when missing (default null)', () => {
    installStorage(memoryStorage())
    expect(readString('x')).toBeNull()
    expect(readString('x', 'yoko')).toBe('yoko')
  })

  it('does not parse raw strings', () => {
    installStorage(memoryStorage({ k: '{bad' }))
    expect(readString('k')).toBe('{bad')
  })

  it('never throws when storage is blocked', () => {
    installThrowingGetter()
    expect(readString('k', 'fb')).toBe('fb')
    expect(writeString('k', 'v')).toBe(false)
  })
})

describe('remove', () => {
  it('removes a key', () => {
    const s = memoryStorage({ k: '1' })
    installStorage(s)
    remove('k')
    expect('k' in s.data).toBe(false)
  })

  it('never throws when storage is blocked', () => {
    installThrowingGetter()
    expect(() => remove('k')).not.toThrow()
  })
})

describe('validators', () => {
  it('isNumberArray', () => {
    expect(isNumberArray([1, 2])).toBe(true)
    expect(isNumberArray([])).toBe(true)
    expect(isNumberArray(['1'])).toBe(false)
    expect(isNumberArray([NaN])).toBe(false)
    expect(isNumberArray({})).toBe(false)
  })

  it('isStringArray', () => {
    expect(isStringArray(['a'])).toBe(true)
    expect(isStringArray([1])).toBe(false)
    expect(isStringArray('a')).toBe(false)
  })

  it('isPlainObject', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject([])).toBe(false)
    expect(isPlainObject(null)).toBe(false)
    expect(isPlainObject('x')).toBe(false)
  })
})
