import { ref, onMounted } from 'vue'
import { fetchBars, fetchTags } from '../api/index.js'

const bars = ref([])
const tags = ref([])
const loading = ref(true)
const error = ref(null)
let loaded = false

async function load(isReload = false) {
  if (loaded && !isReload) return
  if (!isReload) loading.value = true
  error.value = null
  try {
    const [barsData, tagsData] = await Promise.all([fetchBars(), fetchTags()])
    bars.value = barsData
    tags.value = tagsData
    loaded = true
  } catch (err) {
    error.value = err.message
    console.error('Failed to load data:', err)
  } finally {
    loading.value = false
  }
}

export function useApi() {
  onMounted(load)

  async function reload() {
    await load(true)
  }

  return { bars, tags, loading, error, reload }
}
