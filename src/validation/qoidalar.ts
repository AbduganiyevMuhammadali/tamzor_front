/* Validatsiya qoidalari — backend (Joi va controller tekshiruvlari) bilan bir xil.
 * Sxemalar: ./sxemalar.ts (endpoint bo'yicha). Formada ishlatish: ./useForma.ts.
 * Client validatsiya backend o'rnini bosmaydi — server xabari ham ko'rsatiladi. */

export type Qoida = {
  tur: 'matn' | 'son' | 'tanlov' | 'sana' | 'mantiq'
  /** Xabarda ko'rinadigan maydon nomi */
  nom: string
  majburiy?: boolean
  /** matn — belgilar soni; son — qiymat */
  min?: number
  max?: number
  /** son: butun bo'lishi shart */
  butun?: boolean
  /** son: 0 dan katta bo'lishi shart */
  musbat?: boolean
  /** tanlov: ruxsat etilgan qiymatlar */
  qiymatlar?: readonly (string | number)[]
  /** Backend null qabul qilmaydi — bo'sh bo'lsa maydon yuborilmaydi (null emas) */
  nullYoq?: boolean
  /** O'z xabari (majburiy uchun) */
  xabar?: string
}
export type Sxema = Record<string, Qoida>

const boshmi = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
const SANA_RE = /^\d{4}-\d{2}-\d{2}$/
export function sanaTogri(v: unknown) {
  const s = String(v ?? '')
  if (!SANA_RE.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  return !isNaN(+d) && d.toISOString().slice(0, 10) === s
}
const fmt = (n: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(n)

/** Bitta qiymatni tekshiradi — xato matni yoki '' */
export function qiymatXato(q: Qoida, v: unknown): string {
  if (boshmi(v)) return q.majburiy ? (q.xabar || `${q.nom} majburiy`) : ''
  if (q.tur === 'matn') {
    const s = String(v).trim()
    if (q.min !== undefined && s.length < q.min) return `${q.nom} kamida ${q.min} belgi bo'lsin`
    if (q.max !== undefined && s.length > q.max) return `${q.nom} ${q.max} belgidan oshmasin`
    return ''
  }
  if (q.tur === 'son') {
    const n = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'))
    if (!Number.isFinite(n)) return `${q.nom} noto'g'ri (son bo'lishi kerak)`
    if (q.butun && !Number.isInteger(n)) return `${q.nom} butun son bo'lsin`
    if (q.musbat && !(n > 0)) return `${q.nom} 0 dan katta bo'lsin`
    if (q.min !== undefined && n < q.min) return q.min === 0 ? `${q.nom} manfiy bo'lmasin` : `${q.nom} kamida ${fmt(q.min)} bo'lsin`
    if (q.max !== undefined && n > q.max) return `${q.nom} ${fmt(q.max)} dan oshmasin`
    return ''
  }
  if (q.tur === 'tanlov') return q.qiymatlar && !q.qiymatlar.includes(v as any) ? `${q.nom} noto'g'ri` : ''
  if (q.tur === 'sana') return sanaTogri(String(v).slice(0, 10)) ? '' : `${q.nom} noto'g'ri (YYYY-MM-DD)`
  return ''
}

/** Butun obyektni tekshiradi → { maydon: xato } (faqat xatosi borlar) */
export function tekshir(sxema: Sxema, qiymatlar: Record<string, any>): Record<string, string> {
  const x: Record<string, string> = {}
  for (const k in sxema) {
    const m = qiymatXato(sxema[k]!, qiymatlar?.[k])
    if (m) x[k] = m
  }
  return x
}

/** Yuborishdan oldin tozalash: trim, bo'sh satr → null (ixtiyoriy maydonda), son → Number.
 *  Faqat sxemada bor VA obyektda mavjud maydonlarga tegadi; qolgani o'zgarishsiz qoladi. */
export function tozala<T extends Record<string, any>>(sxema: Sxema, qiymatlar: T): T {
  const n: Record<string, any> = { ...qiymatlar }
  for (const k in sxema) {
    if (!(k in n)) continue
    const q = sxema[k]!
    let v = n[k]
    if (typeof v === 'string') v = v.trim()
    if (boshmi(v)) {
      if (q.nullYoq) delete n[k]; else n[k] = null
      continue
    }
    if (q.tur === 'son') {
      const s = typeof v === 'number' ? v : Number(String(v).replace(/\s/g, '').replace(',', '.'))
      n[k] = Number.isFinite(s) ? s : null
    } else if (q.tur === 'sana') n[k] = String(v).slice(0, 10)
    else n[k] = v
  }
  return n as T
}

/** Hisobot davri: boshlanish tugashdan keyin bo'lmasin, ko'pi bilan 366 kun. Xato matni yoki '' */
export const DAVR_MAKS_KUN = 366
export function davrXato(dan: string, gacha: string): string {
  if (!sanaTogri(dan) || !sanaTogri(gacha)) return "Sana noto'g'ri (YYYY-MM-DD)"
  if (dan > gacha) return "Boshlanish sanasi tugash sanasidan keyin bo'lmasin"
  const kun = (Date.parse(gacha + 'T00:00:00Z') - Date.parse(dan + 'T00:00:00Z')) / 86400000 + 1
  return kun > DAVR_MAKS_KUN ? `Davr ${DAVR_MAKS_KUN} kundan oshmasin` : ''
}

/** Joi'ning inglizcha xabarini o'zbekchaga (maydon nomi bilan) — tanilmasa asl xabar qaytadi */
export function joiUz(msg: string, q?: Qoida): string {
  const nom = q?.nom || 'Maydon'
  const m = String(msg || '')
  let r: RegExpMatchArray | null
  if (/is required|is not allowed to be empty|must not be empty/.test(m)) return q?.xabar || `${nom} majburiy`
  if ((r = m.match(/length must be less than or equal to (\d+)/))) return `${nom} ${r[1]} belgidan oshmasin`
  if ((r = m.match(/length must be at least (\d+)/))) return `${nom} kamida ${r[1]} belgi bo'lsin`
  if ((r = m.match(/must be (?:greater|larger) than or equal to (-?[\d.]+)/))) return r[1] === '0' ? `${nom} manfiy bo'lmasin` : `${nom} kamida ${r[1]} bo'lsin`
  if ((r = m.match(/must be less than or equal to (-?[\d.]+)/))) return `${nom} ${r[1]} dan oshmasin`
  if (/must be a number|must be an integer|must be a positive/.test(m)) return `${nom} noto'g'ri (son bo'lishi kerak)`
  if (/must be one of|must be a valid|iso ?date|must be a string|must be a boolean/i.test(m)) return `${nom} noto'g'ri`
  if (/does not match/.test(m)) return 'Parollar mos emas'
  return m
}
