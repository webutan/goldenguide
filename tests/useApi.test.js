import { describe, it, expect, vi, beforeEach } from 'vitest'

const api = vi.hoisted(() => ({
  fetchBars: vi.fn(),
  fetchTags: vi.fn(),
  getBarsServedAt: vi.fn(() => new Date(0)),
  setAdminPassword: vi.fn(),
}))
vi.mock('../src/api/index.js', () => api)
// useApi() registers its first load with onMounted; there is no component here
vi.mock('vue', async (importOriginal) => ({ ...(await importOriginal()), onMounted: () => {} }))

const bar = (id, active = true) => ({ id, is_active: active })
const PUBLIC = [bar(1), bar(2)]
const ADMIN = [bar(1), bar(2), bar(3, false)]

// A fresh copy of the module state (loaded flag, refs) for each test
async function setup() {
  vi.resetModules()
  const { useApi } = await import('../src/composables/useApi.js')
  const { useAdmin } = await import('../src/composables/useAdmin.js')
  return { ...useApi(), isAdmin: useAdmin().isAdmin }
}

beforeEach(() => {
  api.fetchBars.mockReset()
  api.fetchTags.mockReset().mockResolvedValue([{ id: 't' }])
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('useApi', () => {
  it('a failed first load sets error (the error screen) and loads nothing', async () => {
    const s = await setup()
    api.fetchBars.mockRejectedValue(new Error('Failed to fetch bars'))
    expect(await s.reload()).toBe(false)
    expect(s.error.value).toBe('Failed to fetch bars')
    expect(s.loading.value).toBe(false)
    expect(s.stale.value).toBe(false)
    expect(s.bars.value).toEqual([])
  })

  it('a first load that fails can still succeed later, and clears error', async () => {
    const s = await setup()
    api.fetchBars.mockRejectedValueOnce(new Error('x')).mockResolvedValue(PUBLIC)
    await s.reload()
    expect(await s.reload()).toBe(true)
    expect(s.error.value).toBe(null)
    expect(s.bars.value).toEqual(PUBLIC)
  })

  it('after a successful load a failed reload keeps the data and never sets error', async () => {
    const s = await setup()
    api.fetchBars.mockResolvedValue(PUBLIC)
    await s.reload()
    api.fetchBars.mockRejectedValue(new Error('boom'))
    expect(await s.reload()).toBe(false)
    expect(await s.reload()).toBe(false)
    expect(s.error.value).toBe(null)
    expect(s.loading.value).toBe(false)
    expect(s.stale.value).toBe(true)
    expect(s.bars.value).toEqual(PUBLIC)
    expect(s.tags.value).toEqual([{ id: 't' }])
  })

  it('a failing tags request counts as a failed reload too', async () => {
    const s = await setup()
    api.fetchBars.mockResolvedValue(PUBLIC)
    await s.reload()
    api.fetchBars.mockResolvedValue([bar(9)])
    api.fetchTags.mockRejectedValue(new Error('tags'))
    expect(await s.reload()).toBe(false)
    expect(s.bars.value).toEqual(PUBLIC)
    expect(s.stale.value).toBe(true)
  })

  it('the next successful reload refreshes the data and clears stale', async () => {
    const s = await setup()
    api.fetchBars.mockResolvedValue(PUBLIC)
    await s.reload()
    api.fetchBars.mockRejectedValueOnce(new Error('boom'))
    await s.reload()
    api.fetchBars.mockResolvedValue([bar(7)])
    expect(await s.reload()).toBe(true)
    expect(s.stale.value).toBe(false)
    expect(s.bars.value).toEqual([bar(7)])
  })

  it('refreshQuietly: a failure changes nothing, a success clears stale', async () => {
    const s = await setup()
    api.fetchBars.mockResolvedValue(PUBLIC)
    await s.reload()
    api.fetchBars.mockRejectedValue(new Error('offline'))
    await s.refreshQuietly()
    expect(s.stale.value).toBe(false)
    expect(s.bars.value).toEqual(PUBLIC)
    await s.reload()
    expect(s.stale.value).toBe(true)
    api.fetchBars.mockResolvedValue([bar(5)])
    await s.refreshQuietly()
    expect(s.stale.value).toBe(false)
    expect(s.bars.value).toEqual([bar(5)])
  })

  it('records whether the list on screen is the admin one', async () => {
    const s = await setup()
    api.fetchBars.mockResolvedValue(PUBLIC)
    await s.reload()
    expect(s.listIsAdmin.value).toBe(false)
    s.isAdmin.value = true
    api.fetchBars.mockResolvedValue(ADMIN)
    await s.reload()
    expect(s.listIsAdmin.value).toBe(true)
  })

  it('entering admin with a failed reload: public list stays, flagged as not the admin list', async () => {
    const s = await setup()
    api.fetchBars.mockResolvedValue(PUBLIC)
    await s.reload()
    s.isAdmin.value = true
    api.fetchBars.mockRejectedValue(new Error('boom'))
    await s.reload()
    expect(s.bars.value).toEqual(PUBLIC)
    expect(s.listIsAdmin.value).toBe(false)
    expect(s.stale.value).toBe(true)
  })

  it('leaving admin with a failed reload: the inactive bars are dropped', async () => {
    const s = await setup()
    s.isAdmin.value = true
    api.fetchBars.mockResolvedValue(ADMIN)
    await s.reload()
    s.isAdmin.value = false
    api.fetchBars.mockRejectedValue(new Error('boom'))
    await s.reload()
    expect(s.bars.value).toEqual(PUBLIC)
    expect(s.listIsAdmin.value).toBe(false)
    expect(s.stale.value).toBe(true)
  })

  it('a failed reload while still admin keeps the inactive bars', async () => {
    const s = await setup()
    s.isAdmin.value = true
    api.fetchBars.mockResolvedValue(ADMIN)
    await s.reload()
    api.fetchBars.mockRejectedValue(new Error('boom'))
    await s.reload()
    expect(s.bars.value).toEqual(ADMIN)
    expect(s.listIsAdmin.value).toBe(true)
  })

  it('an older answer that arrives late does not overwrite a newer one', async () => {
    const s = await setup()
    api.fetchBars.mockResolvedValue(PUBLIC)
    await s.reload()
    // admin on (slow answer), then off again (fast answer)
    let answerAdmin
    s.isAdmin.value = true
    api.fetchBars.mockReturnValueOnce(new Promise(resolve => { answerAdmin = resolve }))
    const slow = s.reload()
    s.isAdmin.value = false
    api.fetchBars.mockResolvedValueOnce([bar(1)])
    expect(await s.reload()).toBe(true)
    answerAdmin(ADMIN)
    expect(await slow).toBe(false)
    expect(s.bars.value).toEqual([bar(1)])
    expect(s.listIsAdmin.value).toBe(false)
  })

  it('two callers during the first load share one request', async () => {
    const s = await setup()
    let answer
    api.fetchBars.mockReturnValue(new Promise(resolve => { answer = resolve }))
    const a = s.reload()
    const b = s.reload()
    answer(PUBLIC)
    expect(await a).toBe(true)
    expect(await b).toBe(true)
    expect(api.fetchBars).toHaveBeenCalledTimes(1)
    expect(s.bars.value).toEqual(PUBLIC)
  })
})
