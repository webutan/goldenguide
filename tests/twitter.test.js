import { describe, it, expect } from 'vitest'
import { parseTwitterHandle } from '../src/utils/twitter.js'
import { parseTwitterHandle as serverParse } from '../server/lib/feedCore.js'

// [input, expected]. The first seven mirror tests/serverFeedCore.test.js.
const CASES = [
  ['https://twitter.com/BarAlbatross', 'BarAlbatross'],
  ['https://x.com/some_bar?lang=ja', 'some_bar'],
  ['x.com/abc', 'abc'],
  ['https://twitter.com/intent/tweet', null],
  ['https://instagram.com/bar', null],
  ['', null],
  [null, null],
  [undefined, null],
  ['  https://twitter.com/padded  ', 'padded'],
  ['http://www.twitter.com/@with_at', 'with_at'],
  ['https://mobile.twitter.com/mob/status/1', 'mob'],
  ['HTTPS://X.COM/Upper', 'Upper'],
  ['https://x.com/i/lists/1', null],
  ['https://x.com/Search?q=bar', null],
  ['https://twitter.com/hashtag/goldengai', null],
  ['https://x.com/share', null],
  ['https://nottwitter.com/bar', null],
  ['https://x.com/', null],
  ['@bar', null],
]

describe('parseTwitterHandle (frontend)', () => {
  it.each(CASES)('%s -> %s', (input, expected) => {
    expect(parseTwitterHandle(input)).toBe(expected)
  })

  it('agrees with the server copy on every case', () => {
    for (const [input] of CASES) expect(parseTwitterHandle(input)).toBe(serverParse(input))
  })
})
