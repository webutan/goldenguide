import { ref } from 'vue'

const isAdmin = ref(false)

export function useAdmin() {
  function toggleAdmin() {
    isAdmin.value = !isAdmin.value
  }

  return { isAdmin, toggleAdmin }
}
