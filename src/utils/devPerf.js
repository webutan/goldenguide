// Dev-only render/recompute counters, read by perf scripts via window.__mapPerf.
// Everything is behind import.meta.env.DEV, so production builds drop the bodies.
import { onRenderTriggered, onUpdated } from 'vue'

export function devCount(key) {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const counters = (window.__mapPerf ||= {})
    counters[key] = (counters[key] || 0) + 1
  }
}

// Call from a component's setup: counts reactive render triggers and completed updates.
export function devTrackRenders(name) {
  if (import.meta.env.DEV) {
    onRenderTriggered(() => devCount(`triggered:${name}`))
    onUpdated(() => devCount(`updated:${name}`))
  }
}
