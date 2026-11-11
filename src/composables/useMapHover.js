import { shallowRef } from 'vue'

// The building under the pointer on the map (null when none). Written by
// GoldenGaiMap and read by the desktop BarDrawer's hover preview. It lives
// here rather than in App.vue so a hover re-renders only the drawer and not
// the whole app.
const hoveredBuildingId = shallowRef(null)

export function useMapHover() {
  return { hoveredBuildingId }
}
