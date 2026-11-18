/* Bosh sahifa va uning diagramma komponentlari uchun umumiy formatlash */

export function fmtNum(v: number) { return new Intl.NumberFormat('uz-UZ').format(Math.round(v || 0)) }
// Miqdor (kg): tarozi kasri 3 xonagacha saqlanadi (1,234) — butunga yaxlitlanmaydi
export function fmtMiqdor(v: number) { return new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 3 }).format(Number(v) || 0) }

export function fmtShort(v: number) {
  const n = Number(v || 0), a = Math.abs(n), z = n < 0 ? '−' : ''
  if (a >= 1e9) return z + (a / 1e9).toFixed(1) + ' mlrd'
  if (a >= 1e6) return z + (a / 1e6).toFixed(1) + ' mln'
  if (a >= 1e3) return z + Math.round(a / 1e3) + ' ming'
  return z + Math.round(a)
}

/* O'q belgisi: yumaloq qiymatlarda ortiqcha ".0" kerak emas (300 mln, 2.5 mln) */
export function fmtTick(v: number) { return fmtShort(v).replace('.0 ', ' ') }

/* Oy/hafta nomlari qo'lda — ba'zi brauzer/Electron yig'malarida uz-UZ
   lokali yo'q va toLocaleDateString "M10 12" kabi natija beradi */
export const OYLAR = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul',
                      'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
export const HAFTA = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba']

export function sanaUz(d: Date, toliq = false) {
  const oy = OYLAR[d.getMonth()] ?? ''
  return `${d.getDate()}-${toliq ? oy : oy.slice(0, 3)}`
}

export function fmtDate(s: string) {
  const d = new Date(s)
  return isNaN(+d) ? String(s).slice(0, 10) : sanaUz(d)
}

/* "YYYY-MM-DD" ni mahalliy sana sifatida o'qiydi (new Date(str) uni UTC deb oladi) */
export function kunDan(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export const kamHarakat = typeof window !== 'undefined'
  && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
