import { reactive, computed } from 'vue'
import { BASE } from '@/api/api'

interface AuthUser {
  id: number
  username: string
  fullname: string
  role: string
  token: string
  perms: Record<string, string[]> | null
  /** Bitta xarajat limiti (faqat User): null — cheklovsiz, 0 — har xarajat tasdiqqa */
  xarajat_limit?: number | null
}

const STORAGE_KEY = 'sellz_auth'

function loadFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const state = reactive<{ user: AuthUser | null; loading: boolean; error: string }>({
  user: loadFromStorage(),
  loading: false,
  error: '',
})

export const authStore = {
  state,

  isLoggedIn: computed(() => !!state.user?.token),
  user:       computed(() => state.user),
  token:      computed(() => state.user?.token ?? null),

  // foydalanuvchi Admin yoki Programmer bo'lsa barcha sahifalarga kirishi mumkin
  isAdmin: computed(() => state.user?.role === 'Admin' || state.user?.role === 'Programmer'),

  // modulga ruxsat bormi
  hasPerm(module: string, action = 'view'): boolean {
    const user = state.user
    if (!user) return false
    if (user.role === 'Admin' || user.role === 'Programmer') return true
    const perms = user.perms
    if (!perms) return false
    return Array.isArray(perms[module]) && perms[module].includes(action)
  },

  // modulga view ruxsati bormi (sidebar uchun)
  canView(module: string): boolean {
    return this.hasPerm(module, 'view')
  },

  async login(username: string, password: string): Promise<void> {
    state.loading = true
    state.error = ''
    try {
      let res: Response
      try {
        res = await fetch(`${BASE}/users/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        })
      } catch {
        // fetch faqat tarmoq xatosida tashlaydi ("Failed to fetch") — foydalanuvchiga tushunarli matn
        throw new Error("Server bilan aloqa yo'q. Internetni tekshirib, qayta urinib ko'ring")
      }
      const text = await res.text()
      let data: any = null
      try { data = text ? JSON.parse(text) : null } catch { /* ignore */ }

      if (!res.ok) {
        throw new Error(data?.message ?? (res.status >= 500
          ? "Server vaqtincha javob bermayapti. Birozdan so'ng qayta urinib ko'ring"
          : `Server xatosi (${res.status})`))
      }
      if (!data?.token) {
        throw new Error('Serverdan noto\'g\'ri javob keldi')
      }
      state.user = data as AuthUser
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (e: any) {
      state.error = e.message ?? 'Xatolik yuz berdi'
      throw e
    } finally {
      state.loading = false
    }
  },

  logout() {
    state.user = null
    state.error = ''
    localStorage.removeItem(STORAGE_KEY)
  },
}
