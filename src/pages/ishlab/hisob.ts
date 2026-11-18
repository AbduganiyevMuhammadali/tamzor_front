/* Ishlab chiqarish tannarxi — beckend/src/utils/ishlab.utils.js bilan AYNAN bir xil qoida.
   Sahifa yozayotganda jonli ko'rsatadi; yakunlashda server o'zi qayta hisoblaydi.

     Partiya tannarxi C = xom ashyo qiymati X + xarajatlar E − qo'shimcha mahsulot bahosi Q
     Birlik tannarxi    = C / chiqqan sof mahsulot  (bir nechta nav bo'lsa — ulush bo'yicha)
     Yo'qotish          = xom ashyo − (mahsulot + qo'shimcha); narxi sof mahsulotga singadi */

export type QatorTur = 'xom_ashyo' | 'mahsulot' | 'qoshimcha'
export interface HisobQator { tur: QatorTur; miqdor: number | string; narx?: number | string; chakana_narx?: number | string; olchov?: string }
export interface Hisob {
  X: number; E: number; Q: number; C: number
  xomMiqdor: number; mahsulotMiqdor: number; qoshimchaMiqdor: number
  yoqotish: number | null; chiqishFoiz: number | null; birlikBir: boolean
  usul: 'yagona' | 'qiymat' | 'miqdor'
  mahsulotlar: { i: number; ulush: number; summa: number; narx: number }[]
  xato: string | null
}

const n = (v: unknown) => parseFloat(String(v ?? '')) || 0
export const yax = (v: unknown, d = 2) => Math.round(n(v) * 10 ** d) / 10 ** d

export function tannarxHisobla(qatorlar: HisobQator[], xarajatlar: { summa: number | string }[], taqsimlash: 'qiymat' | 'miqdor' = 'qiymat'): Hisob {
  const xom = qatorlar.filter(q => q.tur === 'xom_ashyo')
  const mah = qatorlar.map((q, i) => ({ ...q, i })).filter(q => q.tur === 'mahsulot')
  const qsh = qatorlar.filter(q => q.tur === 'qoshimcha')

  const X = yax(xom.reduce((s, q) => s + n(q.miqdor) * n(q.narx), 0))
  const E = yax((xarajatlar || []).reduce((s, x) => s + n(x.summa), 0))
  const Q = yax(qsh.reduce((s, q) => s + n(q.miqdor) * n(q.narx), 0))
  const C = yax(X + E - Q)

  const xomMiqdor = xom.reduce((s, q) => s + n(q.miqdor), 0)
  const mahsulotMiqdor = mah.reduce((s, q) => s + n(q.miqdor), 0)
  const qoshimchaMiqdor = qsh.reduce((s, q) => s + n(q.miqdor), 0)
  const birliklar = new Set(qatorlar.filter(q => n(q.miqdor) > 0).map(q => String(q.olchov || 'kg').toLowerCase()))
  const birlikBir = birliklar.size <= 1
  const yoqotish = birlikBir ? +(xomMiqdor - mahsulotMiqdor - qoshimchaMiqdor).toFixed(3) : null
  const chiqishFoiz = birlikBir && xomMiqdor > 0 ? yax((mahsulotMiqdor / xomMiqdor) * 100) : null

  let xato: string | null = null
  if (!xom.length || xomMiqdor <= 0) xato = 'Xom ashyo kiritilmagan'
  else if (!mah.length || mahsulotMiqdor <= 0) xato = 'Chiqqan mahsulot miqdori kiritilmagan'
  else if (C <= 0) xato = "Qo'shimcha mahsulot bahosi xom ashyo va xarajatlardan oshib ketdi — bahoni tekshiring"
  else if (birlikBir && (yoqotish as number) < -0.0005) xato = `Chiqqan mahsulot xom ashyodan ko'p (${yax(-(yoqotish as number), 3)} ga) — miqdorlarni tekshiring`

  const qiymatBilan = taqsimlash === 'qiymat' && mah.length > 1 && mah.every(q => n(q.chakana_narx) > 0)
  const usul = mah.length <= 1 ? 'yagona' : qiymatBilan ? 'qiymat' : 'miqdor'
  const vazn = mah.map(q => (qiymatBilan ? n(q.miqdor) * n(q.chakana_narx) : n(q.miqdor)))
  const jamiVazn = vazn.reduce((s, v) => s + v, 0)
  let qolgan = C
  const mahsulotlar = mah.map((q, k) => {
    const ulush = jamiVazn > 0 ? vazn[k] / jamiVazn : 0
    const summa = k === mah.length - 1 ? yax(qolgan) : yax(C * ulush)
    qolgan -= summa
    return { i: q.i, ulush: +ulush.toFixed(6), summa, narx: n(q.miqdor) > 0 ? yax(summa / n(q.miqdor)) : 0 }
  })

  return { X, E, Q, C, xomMiqdor, mahsulotMiqdor, qoshimchaMiqdor, yoqotish, chiqishFoiz, birlikBir, usul, mahsulotlar, xato }
}

/* Partiya holatlari — sahifa va ro'yxat uchun bitta manba */
export const HOLAT: Record<string, { nom: string; cls: string; izoh: string }> = {
  qoralama:   { nom: 'Qoralama',   cls: 'hs-belgi--n',    izoh: 'Reja: xom ashyo hali Xom ashyo omborida' },
  jarayonda:  { nom: 'Jarayonda',  cls: 'hs-belgi--warn', izoh: "Xom ashyo omboridan chiqdi — ishlab chiqarilmoqda" },
  yakunlandi: { nom: 'Skladda',    cls: 'hs-belgi--ok',   izoh: 'Tayyor mahsulot skladga kirdi, tannarx hisoblandi' },
  bekor:      { nom: 'Bekor',      cls: 'hs-belgi--err',  izoh: 'Bekor qilingan — tovar harakati qaytarildi' },
}

/* Jarayon bosqichlari — ro'yxat va hujjat sahifasida bir xil ko'rinadi */
export const BOSQICHLAR = [
  { k: 'qoralama', nom: 'Reja', izoh: "Nimadan, qancha, qanday xarajat — qoralama", ikon: '<path d="M9 4h6M9 4a2 2 0 0 0-2 2v0H5v15h14V6h-2a2 2 0 0 0-2-2"/><path d="M9 12h6M9 16h4"/>' },
  { k: 'jarayonda', nom: 'Ishlab chiqarish', izoh: 'Boshlash: xom ashyo Xom ashyo omboridan chiqadi (o\'rtacha tannarxda)', ikon: '<path d="M3 21V10l6 4v-4l6 4V6l6 3v12z"/><path d="M7 17.5h2M12 17.5h2M17 17.5h2"/>' },
  { k: 'yakunlandi', nom: 'Skladga kirim', izoh: 'Yakunlash: tayyor mahsulot tannarxi bilan asosiy skladga kiradi', ikon: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>' },
]
export const bosqichIndex = (holat: string) => (holat === 'yakunlandi' ? 2 : holat === 'jarayonda' ? 1 : 0)
