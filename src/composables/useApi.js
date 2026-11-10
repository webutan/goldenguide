import { ref, onMounted } from 'vue'
import { fetchBars, fetchTags, getBarsServedAt } from '../api/index.js'

const bars = ref([])
const tags = ref([])
const loading = ref(true)
const error = ref(null)
// When the bar list on screen left the server (older than now when it is a saved copy)
const dataTime = ref(null)
let loaded = false

async function load(isReload = false) {
  if (loaded && !isReload) return
  if (!isReload) loading.value = true
  error.value = null
  try {
    const [barsData, tagsData] = await Promise.all([fetchBars(), fetchTags()])
    bars.value = barsData
    tags.value = tagsData
    dataTime.value = getBarsServedAt()
    loaded = true
  } catch (err) {
    error.value = err.message
    console.error('Failed to load data:', err)
  } finally {
    loading.value = false
  }
}

// Refetch in the background (connection is back, or the service worker has a
// newer copy). A failure changes nothing: what is on screen stays.
async function refreshQuietly() {
  if (!loaded) return
  try {
    const [barsData, tagsData] = await Promise.all([fetchBars(), fetchTags()])
    bars.value = barsData
    tags.value = tagsData
    dataTime.value = getBarsServedAt()
  } catch {
    /* still offline */
  }
}

export function useApi() {
  onMounted(load)

  async function reload() {
    await load(true)
  }

  return { bars, tags, loading, error, dataTime, reload, refreshQuietly }
}
