import { ref } from 'vue'
import { setAdminPassword } from '../api/index.js'
import { useDialog } from './useDialog.js'
import { rateLimitMessage, retryAfterOf } from '../utils/retryAfter.js'

// Exported for plain modules (useReviews) that only need to read the mode
export const isAdmin = ref(false)

export function useAdmin() {
  const dialog = useDialog()
  const { t } = dialog

  async function toggleAdmin() {
    if (isAdmin.value) {
      isAdmin.value = false
      setAdminPassword('')
      return
    }

    const pwd = await dialog.prompt(t('adminPasswordPrompt'), { title: t('adminLoginTitle'), password: true })
    if (!pwd) return

    const res = await fetch('/api/admin/check', {
      headers: { 'X-Admin-Password': pwd },
    })

    if (!res.ok) {
      await dialog.alert(
        res.status === 401 ? t('adminWrongPassword') : res.status === 429 ? rateLimitMessage(t, retryAfterOf(res), 'adminLockedOut') : t('adminServerError'),
        { title: t('adminLoginTitle'), icon: 'error' },
      )
      return
    }

    setAdminPassword(pwd)
    isAdmin.value = true
  }

  return { isAdmin, toggleAdmin }
}
