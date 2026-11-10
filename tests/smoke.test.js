import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useI18n } from '../src/composables/useI18n.js'

describe('useI18n smoke test', () => {
  it('translates "search" in English', () => {
    const { t } = useI18n('en')
    expect(t('search')).toBe('Search')
  })

  it('translates "search" in Japanese', () => {
    const { t } = useI18n('jp')
    expect(t('search')).toBe('検索')
  })

  it('accepts a ref for the language', () => {
    const lang = ref('en')
    const { t } = useI18n(lang)
    expect(t('search')).toBe('Search')
    lang.value = 'jp'
    expect(t('search')).toBe('検索')
  })
})

describe('useI18n interpolation and missing keys', () => {
  it('replaces {placeholders} with params', () => {
    const { t } = useI18n('en')
    expect(t('barCount', { n: 3 })).toBe('3 bars')
    expect(t('visitedTooltip', { visited: 2, total: 5 })).toBe('2 of 5 bars visited')
  })

  it('interpolates in Japanese', () => {
    const { t } = useI18n('jp')
    expect(t('timeMinutesAgo', { n: 5 })).toBe('5分前')
  })

  it('leaves unknown placeholders untouched', () => {
    const { t } = useI18n('en')
    expect(t('barCount', {})).toBe('{n} bars')
  })

  it('returns the key for a missing entry', () => {
    const { t } = useI18n('en')
    expect(t('definitelyNotAKey')).toBe('definitelyNotAKey')
  })
})
