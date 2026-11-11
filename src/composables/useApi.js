import { ref, onMounted } from 'vue'
import { fetchBars, fetchTags, getBarsServedAt } from '../api/index.js'
import { useAdmin } from './useAdmin.js'

const bars = ref([])
const tags = ref([])
const loading = ref(true)
// Set only while there has never been a successful load: App.vue shows the
// error screen for it. Once data is on screen a failed reload sets `stale`
// instead and the app stays up.
const error = ref(null)
// When the bar list on screen left the server (older than now when it is a saved copy)
const dataTime = ref(null)
// The last reload failed: what is on screen is the last good data
const stale = ref(false)
// The list on screen is the admin one (includes inactive bars)
const listIsAdmin = ref(false)
let loaded = false
// Only the newest request may change what is on screen: an older answer that
// arrives late (admin switched on and off again) is dropped.
let latestRequest = 0

/** @returns {Promise<'ok'|'failed'|'superseded'>} */
async function fetchAndApply() {
  const request = ++latestRequest
  const asAdmin = useAdmin().isAdmin.value
  try {
    const [barsData, tagsData] = await Promise.all([fetchBars(), fetchTags()])
    if (request !== latestRequest) return 'superseded'
    bars.value = barsData
    tags.value = tagsData
    dataTime.value = getBarsServedAt()
    listIsAdmin.value = asAdmin
    stale.value = false
    return 'ok'
  } catch (err) {
    if (request !== latestRequest) return 'superseded'
    throw err
  }
}

// A visitor must never be left looking at the admin list: when the refetch
// after leaving admin mode fails, drop the inactive bars locally (which is
// what the public list is).
function dropAdminOnlyBars() {
  if (!listIsAdmin.value || useAdmin().isAdmin.value) return
  bars.value = bars.value.filter(bar => bar.is_active !== false)
  listIsAdmin.value = false
}

let firstLoad = null

function load(isReload = false) {
  if (loaded) return isReload ? reloadLoaded() : Promise.resolve(true)
  // Nothing on screen yet. One request at a time: a second caller waits for
  // the one in flight.
  if (!firstLoad) firstLoad = loadFirst(isReload).finally(() => { firstLoad = null })
  return firstLoad
}

async function loadFirst(isReload) {
  if (!isReload) loading.value = true
  error.value = null
  try {
    if (await fetchAndApply() === 'ok') loaded = true
  } catch (err) {
    error.value = err.message
    console.error('Failed to load data:', err)
  } finally {
    loading.value = false
  }
  return loaded
}

// Every reload after the first successful load: a failure keeps the data on
// screen and raises `stale`; it never sets `error`.
async function reloadLoaded() {
  try {
    return await fetchAndApply() === 'ok'
  } catch (err) {
    console.error('Failed to reload data:', err)
    dropAdminOnlyBars()
    stale.value = true
    return false
  }
}

// Refetch in the background (connection is back, or the service worker has a
// newer copy). A failure changes nothing: what is on screen stays.
async function refreshQuietly() {
  if (!loaded) return
  try {
    await fetchAndApply()
  } catch {
    /* still offline */
    dropAdminOnlyBars()
  }
}

export function useApi() {
  onMounted(load)

  /** Refetch bars and tags. Resolves true when the fresh data is on screen. */
  async function reload() {
    return load(true)
  }

  return { bars, tags, loading, error, dataTime, stale, listIsAdmin, reload, refreshQuietly }
}
