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
