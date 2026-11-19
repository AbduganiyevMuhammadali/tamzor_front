/* Forma validatsiyasi — sxema (./sxemalar.ts) + qiymatlar → maydon yonidagi xatolar.
 *
 *   const f = useForma(sx.mijoz, () => form)
 *   <input v-model="form.nomi" v-maydon:nomi="f"/>        — maxlength, blur, xato matni avtomatik
 *   async function saqla() {
 *     if (!f.tekshir()) return                             — xatolar chiqadi, birinchi maydonga fokus
 *     await f.yubor(async () => {                          — ikki marta bosishdan himoya (f.band)
 *       try { await api.post('/mijozlar', tozala(sx.mijoz, form)); f.tozala() }
 *       catch (e) { xato.value = f.server(e) }             — 400 errors[] maydonlarga bog'lanadi
 *     })
 *   }
 *
 * Xato birinchi yuborishgacha maydondan chiqqanda (blur) ko'rinadi, keyin yozish paytida. */
import { computed, reactive, ref, watchEffect, type Directive, type WatchStopHandle } from 'vue'
import { tekshir as sxemaTekshir, joiUz, type Sxema } from './qoidalar'

export interface Forma {
  sxema: Sxema
  xatolar: { readonly value: Record<string, string> }
  band: { value: boolean }
  umumiy: { value: string }
  xato: (k: string) => string
  tegdi: (k: string) => void
  yozildi: (k: string) => void
  tekshir: () => boolean
  server: (e: any) => string
  tozala: () => void
  yubor: <T>(fn: () => Promise<T>) => Promise<T | undefined>
}

export function useForma(sxema: Sxema, qiymat: () => Record<string, any>): Forma {
  const tegilgan = reactive<Record<string, boolean>>({})
  const serverXato = reactive<Record<string, string>>({})
  const yuborildi = ref(false)
  const band = ref(false)
  const umumiy = ref('')
  const xatolar = computed(() => sxemaTekshir(sxema, qiymat() || {}))

  /** Maydon yonida ko'rsatiladigan xato ('' — ko'rsatilmaydi) */
  const xato = (k: string) => serverXato[k] || ((yuborildi.value || tegilgan[k]) ? xatolar.value[k] : '') || ''
  const tegdi = (k: string) => { tegilgan[k] = true }
  const yozildi = (k: string) => { if (serverXato[k]) delete serverXato[k] }

  /** Yuborishdan oldin: hamma xatoni ko'rsatadi. true — yuborsa bo'ladi */
  function tekshir() {
    yuborildi.value = true
    umumiy.value = ''
    for (const k in serverXato) delete serverXato[k]
    const birinchi = Object.keys(xatolar.value)[0]
    if (!birinchi) return true
    umumiy.value = xatolar.value[birinchi] || ''
    // Birinchi xato maydoniga fokus
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>('.fx-bad')
      el?.focus?.()
      el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    })
    return false
  }

  /** Server xatosi: 400 errors[] → maydonlar; bog'lanmasa umumiy xabar. Ko'rsatish uchun matn qaytaradi */
  function server(e: any): string {
    let boglandi = ''
    for (const x of (e?.errors || []) as any[]) {
      const k = String(x?.param ?? x?.path ?? '').split('.')[0] || ''
      if (k && sxema[k]) {
        serverXato[k] = joiUz(x.msg ?? x.message ?? '', sxema[k])
        boglandi ||= serverXato[k]
      }
    }
    umumiy.value = boglandi || (e?.message === 'session_expired' ? '' : (e?.message || 'Xatolik yuz berdi'))
    return umumiy.value
  }

  function tozala() {
    yuborildi.value = false
    umumiy.value = ''
    for (const k in tegilgan) delete tegilgan[k]
    for (const k in serverXato) delete serverXato[k]
  }

  /** Ikki marta bosishdan himoya: ish tugamaguncha qayta chaqiruv e'tiborsiz qoladi */
  async function yubor<T>(fn: () => Promise<T>): Promise<T | undefined> {
    if (band.value) return undefined
    band.value = true
    try { return await fn() } finally { band.value = false }
  }

  return { sxema, xatolar, band, umumiy, xato, tegdi, yozildi, tekshir, server, tozala, yubor }
}

/* Pul formalari uchun so'rov kaliti (POST /kassa, POST /avtolavka/sotuv): forma ochilganda bir
 * marta yaratiladi, qayta urinishda o'zgarmaydi, muvaffaqiyatli saqlangach `yangila()`. */
export function sorovIdYasa(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // HTTPS bo'lmagan manzilda randomUUID yo'q — getRandomValues bilan (8–64 belgi: harf, raqam, -)
  const b = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  return Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
}
export function useSorovId() {
  const id = ref(sorovIdYasa())
  return { id, yangila: () => { id.value = sorovIdYasa() } }
}

/* v-maydon:<maydon>="forma" — inputga: maxlength (sxemadan), blur'da tekshirish, xato matni va
 * qizil hoshiya. Xato matni element ORQASIGA qo'yiladi; `.ota` modifikatori bilan — ota element
 * orqasiga (input ikonka bilan bir qatorda turgan bo'lsa). */
type MaydonEl = HTMLElement & { _fx?: { stop: WatchStopHandle; yozuv: HTMLElement; blur: () => void; input: () => void; nishon: HTMLElement } }
export const vMaydon: Directive<MaydonEl, Forma | undefined> = {
  mounted(el, b) {
    const f = b.value, k = b.arg
    if (!f || !k) return
    const nishon = (el.matches('input,textarea,select') ? el : el.querySelector<HTMLElement>('input,textarea,select')) || el
    const q = f.sxema[k]
    if (q?.tur === 'matn' && q.max && (nishon instanceof HTMLInputElement || nishon instanceof HTMLTextAreaElement) && nishon.maxLength < 0) nishon.maxLength = q.max
    const yozuv = document.createElement('small')
    yozuv.className = 'fx-xato'
    yozuv.setAttribute('role', 'alert')
    const blur = () => f.tegdi(k), input = () => f.yozildi(k)
    nishon.addEventListener('blur', blur)
    nishon.addEventListener('input', input)
    const stop = watchEffect(() => {
      const x = f.xato(k)
      nishon.classList.toggle('fx-bad', !!x)
      if (x) {
        yozuv.textContent = x
        if (!yozuv.isConnected) (b.modifiers.ota ? el.parentElement : el)?.insertAdjacentElement('afterend', yozuv)
      } else if (yozuv.isConnected) yozuv.remove()
    })
    el._fx = { stop, yozuv, blur, input, nishon }
  },
  beforeUnmount(el) {
    const s = el._fx
    if (!s) return
    s.stop(); s.yozuv.remove()
    s.nishon.removeEventListener('blur', s.blur)
    s.nishon.removeEventListener('input', s.input)
    s.nishon.classList.remove('fx-bad')
    delete el._fx
  },
}
