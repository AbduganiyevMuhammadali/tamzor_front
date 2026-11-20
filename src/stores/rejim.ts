import { reactive, computed } from 'vue'
// @ts-ignore — api.js tiplanmagan (MainLayout.vue dagidek)
import { BASE } from '@/api/api'

/* Biznes rejimi — server .env dagi BIZNES_REJIM (GET /rejim) dan olinadi.
   distributsiya (sukut): agent, dostavchik, Van Sell, buyurtma zanjiri.
   optom: mijoz omborga keladi, sotuv shu zahoti skladdan — agent / dostavchik /
   mashina bo'limlari menyuda ham, yo'naltirishda ham yo'q.
   Oxirgi qiymat localStorage'da saqlanadi, sahifa ochilganda menyu "sakramasin". */
export type Rejim = 'distributsiya' | 'optom'

const KALIT = 'sellz_rejim'

function saqlangan(): Rejim {
  try {
    return localStorage.getItem(KALIT) === 'optom' ? 'optom' : 'distributsiya'
  } catch {
    return 'distributsiya'
  }
}

const state = reactive<{ rejim: Rejim }>({ rejim: saqlangan() })

export const rejimStore = {
  state,
  isOptom: computed(() => state.rejim === 'optom'),

  /* Element shu rejimda ko'rinadimi: `faqat` berilmagan bo'lsa — har ikkalasida */
  mos(faqat?: Rejim): boolean {
    return !faqat || faqat === state.rejim
  },

  /* Serverdan yangilash. Server javob bermasa oxirgi ma'lum qiymat qoladi. */
  async yukla(): Promise<void> {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 4000)
    try {
      const res = await fetch(`${BASE}/rejim`, { signal: ctrl.signal })
      if (!res.ok) return
      const d = await res.json()
      const r: Rejim = d?.rejim === 'optom' ? 'optom' : 'distributsiya'
      state.rejim = r
      try { localStorage.setItem(KALIT, r) } catch { /* storage yo'q */ }
    } catch {
      /* tarmoq xatosi — saqlangan qiymat bilan davom etamiz */
    } finally {
      clearTimeout(t)
    }
  },
}
