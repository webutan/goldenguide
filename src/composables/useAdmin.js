import { ref } from 'vue'
import { setAdminPassword } from '../api/index.js'

const isAdmin = ref(false)

export function useAdmin() {
  async function toggleAdmin() {
    if (isAdmin.value) {
      isAdmin.value = false
      setAdminPassword('')
      return
    }

    const pwd = window.prompt('Admin password:')
    if (!pwd) return

    const res = await fetch('/api/admin/check', {
      headers: { 'X-Admin-Password': pwd },
    })

    if (res.status === 401) {
      window.alert('Incorrect password.')
      return
    }

    setAdminPassword(pwd)
    isAdmin.value = true
  }

  return { isAdmin, toggleAdmin }
}
