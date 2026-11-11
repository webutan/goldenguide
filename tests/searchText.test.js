import { describe, it, expect } from 'vitest'
import { normalize, buildSearchIndex, searchBars, matches } from '../src/utils/searchText.js'

describe('normalize', () => {
  it('folds full-width, case, katakana and half-width kana', () => {
    expect(normalize('ＢＡＲ')).toBe('bar')
    expect(normalize('バー')).toBe('ばー')
    expect(normalize('ﾊﾞｰ')).toBe('ばー')
    expect(normalize('ばー')).toBe('ばー')
  })
  it('drops spaces, middle dots and hyphens but keeps the long-vowel mark', () => {
    expect(normalize('Hanazono 1')).toBe(normalize('hanazono-1'))
    expect(normalize('ジャック・ダニエル')).toBe(normalize('ジャックダニエル'))
    expect(normalize('バー')).not.toBe(normalize('バ'))
  })
  it('handles null and non-strings', () => {
    expect(normalize(null)).toBe('')
    expect(normalize(undefined)).toBe('')
    expect(normalize(248)).toBe('248')
  })
})

const bars = [
  { id: 1, name_en: 'Bar Albatross', name_jp: 'バー アルバトロス', street: 'hanazono-5', tags: [{ id: 'karaoke', label: 'Karaoke', label_jp: 'カラオケ' }] },
  { id: 2, name_en: 'Deathmatch in Hell', name_jp: 'デスマッチ・イン・ヘル', street: 'hanazono-3', tags: [] },
  { id: 3, name_en: null, name_jp: 'ひまわり', street: 'maneki-dori', tags: ['smoking'] },
  { id: 4, name_en: 'Karaoke Zero', name_jp: null, street: 'hanazono-5' },
]
const index = buildSearchIndex(bars)
const ids = q => searchBars(index, q).map(b => b.id)

describe('searchBars', () => {
  it('matches kana variants of the same word', () => {
    for (const q of ['ばー', 'バー', 'ﾊﾞｰ']) expect(ids(q)).toEqual([1])
  })
  it('matches full-width latin and ignores case', () => {
    expect(ids('ＡＬＢＡ')).toEqual([1])
    expect(ids('DEATHMATCH')).toEqual([2])
  })
  it('ignores separators on both sides', () => {
    expect(ids('デスマッチイン')).toEqual([2])
    expect(ids('death match')).toEqual([2])
  })
  it('finds every bar on a street, by id or Japanese name, with no cap', () => {
    expect(ids('hanazono 5')).toEqual([1, 4])
    expect(ids('花園五番街')).toEqual([1, 4])
    expect(ids('まねき')).toEqual([3])
    const many = buildSearchIndex(Array.from({ length: 30 }, (_, i) => ({ id: i, name_jp: `店${i}`, street: 'hanazono-1' })))
    expect(searchBars(many, 'hanazono')).toHaveLength(30)
  })
  it('searches tag labels in both languages', () => {
    expect(ids('カラオケ')).toEqual([1])
    expect(ids('smoking')).toEqual([3])
  })
  it('ranks name matches above street/tag matches', () => {
    // bar 4 has "Karaoke" in its name; bar 1 only has the tag
    expect(ids('karaoke')).toEqual([4, 1])
  })
  it('returns nothing for an empty or separator-only query', () => {
    expect(ids('')).toEqual([])
    expect(ids('  ・ ')).toEqual([])
  })
})

describe('matches', () => {
  it('checks a single bar', () => {
    expect(matches(bars[2], 'ヒマワリ')).toBe(true)
    expect(matches(bars[2], 'albatross')).toBe(false)
  })
})
