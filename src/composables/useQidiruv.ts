/* Server qidiruvi uchun yagona yechim — hamma qidiruv joyida shu ishlatiladi.
 *
 *  - Debounce 350 ms; Enter (`darhol`) darhol yuboradi; matn tozalansa ham kutilmaydi.
 *  - Faqat oxirgi so'rov natijasi qo'llanadi: oldingisi AbortController bilan bekor qilinadi,
 *    qo'shimcha himoya — tartib raqami (kechikib kelgan javob tashlab yuboriladi).
 *  - Matn: trim, ko'pi bilan 100 belgi (backend shundan keyin kesadi). Avtomatik qidiruv
 *    kamida 2 belgidan; Enter bilan 1 belgi ham mumkin. Bo'sh matn — to'liq ro'yxat.
 *  - Bir xil matn (va filtrlar) qayta yuborilmaydi.
 *  - Matn o'zgarsa `sahifa` 1 ga qaytadi.
 *  - Yuklanayotganda eski natija joyida qoladi (`qolla` faqat javob kelganda chaqiriladi).
 *  - Komponent yopilganda kutilayotgan so'rov bekor qilinadi.
 *
 *  Ishlatish:
 *    const qd = useQidiruv({ matn: search, sahifa: page, yuklanmoqda: loading,
 *      kalit: () => [holat.value],
 *      yukla: q => api.get(`/tovar?search=${encodeURIComponent(q)}`),   // so'rov SINXRON boshlanadi
 *      qolla: d => { rows.value = d.data },
 *      xato: e => toast(e.message) })
 *    qd.qayta()   — filtr/sahifa o'zgardi yoki saqlashdan keyin (majburiy qayta yuklash)
 *    qd.filtr()   — filtr o'zgardi: 1-sahifa + qayta yuklash
 *    qd.darhol()  — Enter
 */
import { ref, watch, onScopeDispose, getCurrentScope, type Ref } from 'vue'
import { signalBilan, bekorXatomi } from '../api/api.js'

export const QIDIRUV_KECHIKISH = 350
export const QIDIRUV_MIN = 2
export const QIDIRUV_MAKS = 100

export const qidiruvMatn = (v: unknown) => String(v ?? '').trim().slice(0, QIDIRUV_MAKS)

export interface QidiruvSozlama<T> {
  matn: Ref<string>
  /** So'rovni yuboradi. API chaqiruvi funksiya ichida `await`dan OLDIN boshlanishi kerak (bekor qilish uchun). */
  yukla: (q: string) => Promise<T>
  /** Faqat oxirgi so'rov javobi bilan chaqiriladi */
  qolla: (d: T, q: string) => void
  xato?: (e: any) => void
  sahifa?: Ref<number>
  yuklanmoqda?: Ref<boolean>
  /** Filtrlar — takror so'rovni aniqlash uchun (matn bilan birga solishtiriladi) */
  kalit?: () => unknown
  kechikish?: number
  minBelgi?: number
}

export function useQidiruv<T = any>(o: QidiruvSozlama<T>) {
  const yuklanmoqda = o.yuklanmoqda ?? ref(false)
  const amal = ref('')            // hozir amalda bo'lgan (serverga yuborilgan) matn
  const min = o.minBelgi ?? QIDIRUV_MIN
  let taymer: ReturnType<typeof setTimeout> | undefined
  let ctrl: AbortController | null = null
  let tartib = 0
  let oxirgiKalit: string | null = null

  const kalitYasa = (q: string) => JSON.stringify([q, o.kalit?.() ?? null, o.sahifa?.value ?? null])

  async function ishga(q: string, majbur: boolean) {
    const k = kalitYasa(q)
    if (!majbur && k === oxirgiKalit) return
    oxirgiKalit = k
    amal.value = q
    ctrl?.abort()
    ctrl = new AbortController()
    const n = ++tartib
    yuklanmoqda.value = true
    try {
      const d = await signalBilan(ctrl.signal, () => o.yukla(q))
      if (n !== tartib) return
      o.qolla(d, q)
    } catch (e: any) {
      if (n !== tartib || bekorXatomi(e)) return
      oxirgiKalit = null          // xatodan keyin o'sha matnni qayta yuborish mumkin bo'lsin
      o.xato?.(e)
    } finally {
      if (n === tartib) yuklanmoqda.value = false
    }
  }

  function yangiMatn(q: string) {
    if (q !== amal.value && o.sahifa) o.sahifa.value = 1
    return ishga(q, false)
  }

  watch(o.matn, v => {
    clearTimeout(taymer)
    const q = qidiruvMatn(v)
    if (q.length > 0 && q.length < min) return     // 1 belgi — faqat Enter bilan
    if (!q) { yangiMatn(''); return }              // tozalandi — kutmasdan (eski so'rov ham bekor bo'ladi)
    taymer = setTimeout(() => yangiMatn(q), o.kechikish ?? QIDIRUV_KECHIKISH)
  })

  /** Enter — kutmasdan, 1 belgi bilan ham */
  function darhol() {
    clearTimeout(taymer)
    return yangiMatn(qidiruvMatn(o.matn.value))
  }

  /** Majburiy qayta yuklash (filtr, sahifa, saqlashdan keyin). Yozilayotgan matn yaroqli bo'lsa o'shani oladi. */
  function qayta() {
    clearTimeout(taymer)
    const q = qidiruvMatn(o.matn.value)
    return ishga(q.length === 0 || q.length >= min ? q : amal.value, true)
  }

  /** Filtr o'zgardi — 1-sahifadan */
  function filtr() {
    if (o.sahifa) o.sahifa.value = 1
    return qayta()
  }

  function toxtat() {
    clearTimeout(taymer)
    tartib++
    ctrl?.abort()
    ctrl = null
  }
  if (getCurrentScope()) onScopeDispose(toxtat)

  return { yuklanmoqda, amal, darhol, qayta, filtr, toxtat }
}
