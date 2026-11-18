/* Hisobotlar uchun umumiy yordamchilar: davr, formatlash, CSV.
   Tanlangan davr barcha hisobotlarda bir xil saqlanadi (bir marta tanlang —
   boshqa hisobotga o'tsangiz ham o'sha davr). */
import { ref, watch, type Ref, type WatchSource } from 'vue'

/* ── Formatlash ── */
export const fmt = (v: unknown) => new Intl.NumberFormat('ru-RU').format(Math.round(Number(v) || 0))
// Miqdor (kg): tarozi kasri 3 xonagacha ko'rsatiladi (1,234) — pul kabi butunga yaxlitlanmaydi
export const fmtMiqdor = (v: unknown) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(Number(v) || 0)
export function qisqa(v: unknown): string {
  const n = Number(v) || 0, a = Math.abs(n)
  const k = (x: number, d = 1) => x.toFixed(d).replace(/\.0$/, '').replace('.', ',')
  if (a >= 1e9) return `${k(n / 1e9, 2)} mlrd`
  if (a >= 1e6) return `${k(n / 1e6, a >= 1e8 ? 0 : 1)} mln`
  if (a >= 1e4) return `${Math.round(n / 1e3)} ming`
  return fmt(n)
}
export const foizFmt = (v: unknown, d = 1) => `${(Number(v) || 0).toFixed(d).replace(/\.0$/, '').replace('.', ',')}%`
/** Oldingi davrga nisbatan o'zgarish (%) — oldingi 0 bo'lsa null */
export const ozgarish = (joriy: unknown, oldingi: unknown): number | null => {
  const o = Number(oldingi) || 0
  // Asos 0 yoki manfiy (masalan o'tgan davr zarar bilan yopilgan) — foiz ma'nosiz
  return o > 0 ? +(((Number(joriy) || 0) - o) / o * 100).toFixed(1) : null
}

const OY = ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek']
const OY_TOLIQ = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const pad = (n: number) => String(n).padStart(2, '0')
export const kunKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Sana: '12 okt' (yil joriy bo'lmasa '12 okt 2025') */
export function sanaQisqa(s: string | Date | null | undefined) {
  if (!s) return '—'
  const d = typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s)
  if (isNaN(+d)) return '—'
  return `${d.getDate()} ${OY[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}`
}
export const sanaVaqt = (s: string | Date) => {
  const d = new Date(s)
  return isNaN(+d) ? '—' : `${sanaQisqa(d)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const kunOldin = (kun: number | null | undefined) =>
  kun === null || kun === undefined ? '—' : kun === 0 ? 'bugun' : kun === 1 ? 'kecha' : `${kun} kun oldin`

/** Grafik o'qi uchun guruh kaliti nomi: kun → '12 okt', hafta → '6 okt', oy → 'okt 26' */
export function kalitNom(k: string, guruh: string, uzun = false) {
  if (guruh === 'oy' || /^\d{4}-\d{2}$/.test(k)) {
    const [y, m] = k.split('-').map(Number)
    return uzun ? `${OY_TOLIQ[m! - 1]} ${y}` : `${OY[m! - 1]} ${String(y).slice(2)}`
  }
  const d = new Date(k + 'T00:00:00')
  if (guruh === 'hafta' && uzun) {
    const e = new Date(d); e.setDate(e.getDate() + 6)
    return `${d.getDate()} ${OY[d.getMonth()]} – ${e.getDate()} ${OY[e.getMonth()]}`
  }
  return `${d.getDate()} ${OY[d.getMonth()]}`
}
export const GURUH_NOM: Record<string, string> = { kun: 'kunlar', hafta: 'haftalar', oy: 'oylar' }

/* ── Davr ── */
export const PRESETLAR = [
  { k: '7', nom: '7 kun' },
  { k: '30', nom: '30 kun' },
  { k: 'oy', nom: 'Bu oy' },
  { k: 'otgan', nom: "O'tgan oy" },
  { k: '90', nom: '90 kun' },
  { k: 'yil', nom: 'Bu yil' },
]
export function presetDavr(k: string) {
  const b = new Date(), dan = new Date(b)
  let gacha = new Date(b)
  if (k === 'oy') dan.setDate(1)
  else if (k === 'otgan') { dan.setMonth(dan.getMonth() - 1, 1); gacha = new Date(b.getFullYear(), b.getMonth(), 0) }
  else if (k === 'yil') dan.setMonth(0, 1)
  else dan.setDate(dan.getDate() - (Number(k) - 1))
  return { dan: kunKey(dan), gacha: kunKey(gacha) }
}
export function presetTop(dan: string, gacha: string) {
  return PRESETLAR.find(p => { const d = presetDavr(p.k); return d.dan === dan && d.gacha === gacha })?.k || ''
}
export function davrMatn(dan: string, gacha: string) {
  if (dan === gacha) return sanaQisqa(dan)
  return `${sanaQisqa(dan)} – ${sanaQisqa(gacha)}`
}

const SAQLASH = 'sellz_hisobot_davr'
function boshlangich() {
  try {
    const s = JSON.parse(localStorage.getItem(SAQLASH) || 'null')
    if (s?.preset) return presetDavr(s.preset)          // "30 kun" har kuni yangilanadi
    if (s?.dan && s?.gacha) return { dan: s.dan, gacha: s.gacha }
  } catch { /* saqlanmagan */ }
  return presetDavr('30')
}
/** Barcha hisobotlar uchun umumiy davr holati (modul darajasidagi yagona nusxa) */
const _d = boshlangich()
export const davr = { dan: ref(_d.dan), gacha: ref(_d.gacha) }
watch([davr.dan, davr.gacha], ([dan, gacha]) => {
  try { localStorage.setItem(SAQLASH, JSON.stringify({ dan, gacha, preset: presetTop(dan, gacha) || null })) } catch { /* yashirin rejim */ }
})

/* ── CSV (Excel ochadi) ── */
export function csvYukla(nom: string, ustunlar: { k: string; nom: string }[], qatorlar: Record<string, unknown>[]) {
  const q = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const matn = [ustunlar.map(u => q(u.nom)).join(';'), ...qatorlar.map(r => ustunlar.map(u => q(r[u.k])).join(';'))].join('\n')
  const blob = new Blob(['﻿' + matn], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${nom}_${davr.dan.value}_${davr.gacha.value}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}

/* ── Ikonlar (24×24, chiziqli) — nav.ts dagi IK bilan bir uslubda ── */
export const IKON = {
  puls: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
  grafik: '<path d="M3 3v18h18"/><path d="M8 17v-5M13 17V8M18 17v-9"/>',
  osish: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  pul: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  hamyon: '<path d="M18 9V6a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  chek: '<path d="M6 2.5h12v19l-3-2-3 2-3-2-3 2z"/><path d="M9 7.5h6M9 11.5h6M9 15.5h3.5"/>',
  savat: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12h12L22 7H6.2"/>',
  quti: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  qutilar: '<rect x="3" y="12" width="8" height="8" rx="1.2"/><rect x="13" y="12" width="8" height="8" rx="1.2"/><rect x="8" y="3" width="8" height="8" rx="1.2"/>',
  ombor: '<path d="M3 21V8.5l9-5.5 9 5.5V21"/><path d="M7 21v-8h10v8"/><path d="M7 17h10"/>',
  dokon: '<path d="M3.5 9 5 4h14l1.5 5"/><path d="M3.5 9a2.8 2.8 0 0 0 5.6 0 2.8 2.8 0 0 0 5.8 0 2.8 2.8 0 0 0 5.6 0"/><path d="M5 12v8h14v-8"/><path d="M10 20v-5h4v5"/>',
  agent: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M21.5 20a6.5 6.5 0 0 0-3.6-5.8"/>',
  zavod: '<path d="M3 21V10l6 4v-4l6 4V6l6 3v12z"/><path d="M7 17.5h2M12 17.5h2M17 17.5h2"/>',
  kirim: '<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  soat: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  ogoh: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  kassa: '<rect x="3" y="10" width="18" height="11" rx="2"/><path d="M7 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/><path d="M8 15h8"/>',
  kitob: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  pirog: '<path d="M21 12A9 9 0 1 1 12 3v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  almash: '<path d="M7 7.5h13l-3.5-3.5M17 16.5H4l3.5 3.5"/>',
  mashina: '<path d="M2 6h11v10H2z"/><path d="M13 9h4.2l3.8 4.2V16h-8"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  tugaydi: '<path d="M3 12a9 9 0 1 0 9-9"/><path d="M12 7v5l3 2"/><path d="M3 4v4h4"/>',
  yuklab: '<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  strelka: '<path d="m9 6 6 6-6 6"/>',
  qidir: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
}

/* Seriya ranglari — bitta brend (indigo) + ma'no bildiruvchi yashil/sariq/qizil */
export const RANG = {
  brand: '#4f46e5', brand2: '#818cf8', brand3: '#c7d2fe', brandTo: '#312e81',
  ok: '#059669', warn: '#d97706', err: '#dc2626', neytral: '#94a3b8',
}
export const RAMPA = ['#4f46e5', '#818cf8', '#3730a3', '#a5b4fc', '#6366f1', '#c7d2fe', '#312e81', '#94a3b8']

/** Hisobot ma'lumotini davr (va qo'shimcha filtrlar) o'zgarganda qayta yuklash.
   Eski so'rov kechikib kelsa — yangisining ustiga yozilmaydi. */
export function useYuklash(fn: () => Promise<any>, qoshimcha: WatchSource[] = []) {
  const data = ref<any>(null) as Ref<any>
  const yuklanmoqda = ref(false)
  const xato = ref('')
  let navbat = 0
  async function yukla() {
    const id = ++navbat
    yuklanmoqda.value = true; xato.value = ''
    try { const r = await fn(); if (id === navbat) data.value = r }
    catch (e: any) { if (id === navbat) xato.value = e?.message || "Ma'lumotni yuklab bo'lmadi" }
    finally { if (id === navbat) yuklanmoqda.value = false }
  }
  watch([davr.dan, davr.gacha, ...qoshimcha], yukla, { immediate: true })
  return { data, yuklanmoqda, xato, yukla }
}
