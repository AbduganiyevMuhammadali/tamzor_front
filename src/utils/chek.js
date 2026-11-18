/**
 * YETKAZISH CHEKI — 80 mm termo printer (Xprinter XP-80C va shunga o'xshashlar).
 *
 * chekHtml(arizalar, firma) — faqat HTML matn (DOMsiz, sinovda ham ishlatiladi);
 * chekChop(arizalar, firma) — yashirin iframe'da ochib brauzerning chop etish oynasini chaqiradi.
 * Bir necha ariza berilsa har biri alohida chek (sahifa uzilishi bilan) — "toplu yo'lga chiqarish".
 *
 * O'lcham: qog'oz 80 mm, bosiladigan eni 72 mm (@page size 80mm auto, margin 0).
 * Printer drayverida qog'oz "80 mm" / "Roll paper", chekka 0 bo'lishi kerak.
 *
 * O'qilishi: termo printer (203 dpi) ingichka shriftni xira bosadi, shuning uchun hamma matn
 * faqat 900 (black) sans-serif, 14,5 px dan kichik emas, -webkit-text-stroke .5 px, chiziqlar 3 px, rang faqat #000
 * (2026-10-31: 700/14 px ham xira chiqdi — foydalanuvchi yana "harflar ko'rinmayapti" dedi).
 * Ingichka Courier / 11–12 px ishlatmang — qog'ozda ko'rinmas bo'lib qoladi.
 *
 * Holat: yo'lga chiqarilgan (va undan oldingi) zakazda "Oldingi qarz / Yetkazilgach qarz" chiqadi;
 * yetkazilgan zakazda balans allaqachon shu savdoni o'z ichiga olgan — faqat joriy qarz chiqadi;
 * bekor qilingan zakazda "BEKOR QILINGAN" belgisi, qarz qatorlari yo'q.
 */

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
const pul = (v) => Math.round(Number(v) || 0).toLocaleString('ru-RU')
const miq = (v) => (Number(v) || 0).toLocaleString('ru-RU', { maximumFractionDigits: 3 })
const sana = (d) => {
  const x = d ? new Date(d) : new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()} ${p(x.getHours())}:${p(x.getMinutes())}`
}
const kun = (s) => {
  if (!s) return '—'
  const x = new Date(String(s).length === 10 ? s + 'T00:00:00' : s)
  const p = (n) => String(n).padStart(2, '0')
  return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()}`
}
const TOLOV = { naqt: 'Naqd — yetkazishda olinadi', naqd: 'Naqd — yetkazishda olinadi', qarz: 'Qarzga', plastik: 'Plastik', karta: 'Karta', bank: 'Bank', optom: 'Optom', chaka: 'Chakana' }
const HOLAT = { tasdiqlangan: 'Tasdiqlangan', yigilmoqda: "Yig'ilmoqda", yolda: "Yo'lda", yetkazildi: 'Yetkazildi', bekor: 'Bekor qilingan' }

/* Bitta chek (bir ariza) */
function bittaChek(a, firma) {
  const q = a.qatorlar || []
  const jamiKg = q.reduce((s, x) => s + (Number(x.jami_dona) || 0), 0)
  const jami = Number(a.jami_summa) || 0
  const m = a.mijoz || {}
  const balans = Number(m.balans ?? 0)
  const joriyQarz = balans < 0 ? -balans : 0          // manfiy balans = mijoz qarzdor
  const qarzga = !(a.tolov_turi === 'naqt' || a.tolov_turi === 'naqd')
  const yetkazilgan = a.holat === 'yetkazildi'
  const bekor = a.holat === 'bekor'
  const yangiQarz = joriyQarz + (qarzga ? jami : 0)
  const olchov = (x) => esc(x.olchov || 'kg')

  let qarzBlok = ''
  if (!bekor) {
    if (yetkazilgan) {
      qarzBlok = joriyQarz > 0 ? `
  <div class="c-line c-line--thin"></div>
  <div class="c-row c-qarz"><span>Mijoz qarzi (hozir)</span><b>${pul(joriyQarz)}</b></div>` : ''
    } else if (joriyQarz > 0 || qarzga) {
      qarzBlok = `
  <div class="c-line c-line--thin"></div>
  <div class="c-row"><span>Oldingi qarz</span><span>${pul(joriyQarz)}</span></div>
  <div class="c-row c-qarz"><span>Yetkazilgach qarz</span><b>${pul(yangiQarz)}</b></div>`
    }
  }

  return `
<section class="chek">
  <div class="c-firma">${esc(firma.nomi || 'Sellz Distributor')}</div>
  ${firma.telefon ? `<div class="c-c">Tel: ${esc(firma.telefon)}</div>` : ''}
  ${firma.manzil ? `<div class="c-c">${esc(firma.manzil)}</div>` : ''}
  <div class="c-line"></div>
  <div class="c-row c-title"><span>YETKAZISH CHEKI</span><span>${esc(a.raqam || '#' + a.id)}</span></div>
  ${bekor ? `<div class="c-stamp">BEKOR QILINGAN</div>` : ''}
  <div class="c-row"><span>Chop etildi</span><span>${sana()}</span></div>
  <div class="c-row"><span>Yetkazish kuni</span><span>${kun(a.jonatish_sana)}</span></div>
  ${yetkazilgan && a.yetkazilgan_sana ? `<div class="c-row"><span>Yetkazildi</span><span>${sana(a.yetkazilgan_sana)}</span></div>` : ''}
  ${!yetkazilgan && !bekor && a.holat && a.holat !== 'yolda' ? `<div class="c-row"><span>Holat</span><span>${esc(HOLAT[a.holat] || a.holat)}</span></div>` : ''}
  <div class="c-line"></div>
  <div class="c-kv"><span>Mijoz</span><b>${esc(a.mijoz_nomi || m.nomi || '—')}</b></div>
  ${m.telefon ? `<div class="c-kv"><span>Tel</span><span>${esc(m.telefon)}</span></div>` : ''}
  ${m.manzil ? `<div class="c-kv"><span>Manzil</span><span>${esc(m.manzil)}</span></div>` : ''}
  ${a.agent_nomi ? `<div class="c-kv"><span>Agent</span><span>${esc(a.agent_nomi)}</span></div>` : ''}
  ${a.dostavchi_nomi ? `<div class="c-kv"><span>Dostavchik</span><span>${esc(a.dostavchi_nomi)}${a.dostavchi && a.dostavchi.mashina_raqam ? ' · ' + esc(a.dostavchi.mashina_raqam) : ''}</span></div>` : ''}
  ${a.dostavchi_nomi && a.dostavchi && a.dostavchi.telefon ? `<div class="c-kv"><span>Dost. tel</span><span>${esc(a.dostavchi.telefon)}</span></div>` : ''}
  <div class="c-line"></div>
  <div class="c-th"><span>Tovar</span><span>Miqdor × narx = summa</span></div>
  ${tovarBloklari(q, olchov)}
  <div class="c-line"></div>
  <div class="c-row c-sub"><span>${q.length} xil · ${miq(jamiKg)} kg</span><span></span></div>
  ${Number(a.chegirma_summa) > 0 ? `<div class="c-row"><span>Chegirma</span><span>−${pul(a.chegirma_summa)}</span></div>` : ''}
  <div class="c-jami"><span>JAMI</span><span>${pul(jami)} so'm</span></div>
  <div class="c-row"><span>To'lov</span><span>${esc(yetkazilgan && !qarzga ? 'Naqd — olindi' : (TOLOV[a.tolov_turi] || a.tolov_turi || '—'))}</span></div>${qarzBlok}
  ${a.izoh ? `<div class="c-line c-line--thin"></div><div class="c-izoh">${esc(a.izoh)}</div>` : ''}
  <div class="c-line"></div>
  <div class="c-imzo"><span>Dostavchik</span><span class="c-chiziq"></span></div>
  <div class="c-imzo"><span>Qabul qildim</span><span class="c-chiziq"></span></div>
  <div class="c-foot">${esc(firma.izoh || 'Xaridingiz uchun rahmat!')}</div>
</section>`
}

/* Tovarlar turkumi — umumiy nomi (To'vuq go'shti, Mol go'shti …) bo'yicha guruhlanadi:
   sarlavha, ostida shu turkum tovarlari; raqamlash chek bo'ylab davom etadi. Birorta
   qatorda ham turkum bo'lmasa — sarlavhasiz, oddiy ro'yxat. Turkumsizlar "Boshqa" ostida.
   (foydalanuvchi so'rovi 2026-11-01: "chekda tovarni umumiy nomi") */
function tovarBloklari(q, olchov) {
  const bor = q.some((x) => x.turkum)
  const guruhlar = []
  for (const x of q) {
    const k = bor ? (x.turkum || 'Boshqa') : ''
    let g = guruhlar.find((y) => y.k === k)
    if (!g) { g = { k, list: [] }; guruhlar.push(g) }
    g.list.push(x)
  }
  let i = 0
  return guruhlar.map((g) => `${g.k ? `<div class="c-turkum">${esc(g.k)}</div>` : ''}${g.list.map((x) => `<div class="c-item">
    <div class="c-item-n">${++i}. ${esc(x.tovar_nomi)}</div>
    <div class="c-item-r"><span>${miq(x.jami_dona)} ${olchov(x)} × ${pul(x.narx)}</span><b>${pul(x.summa)}</b></div>
  </div>`).join('')}`).join('')
}

/** Bir yoki bir necha ariza uchun to'liq chop etiladigan HTML hujjat */
export function chekHtml(arizalar, firma = {}) {
  const list = Array.isArray(arizalar) ? arizalar : [arizalar]
  return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Chek</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    width: 80mm; color: #000;
    font-family: Arial, Helvetica, "Liberation Sans", "DejaVu Sans", sans-serif;
    font-size: 15.5px; font-weight: 900; line-height: 1.3; letter-spacing: .15px;
    -webkit-text-stroke: .5px #000;            /* termo printerda harflar to'laroq, qoraroq chiqadi */
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
    -webkit-font-smoothing: none;
  }
  b, strong { font-weight: 900; }
  .chek { width: 72mm; margin: 0 auto; padding: 3mm 0 6mm; page-break-after: always; }
  .chek:last-child { page-break-after: auto; }
  .c-firma { text-align: center; font-size: 32px; font-weight: 900; letter-spacing: .8px; text-transform: uppercase; line-height: 1.1; -webkit-text-stroke: 1.1px #000; word-break: break-word; margin-bottom: 3px; }   /* "logo" — foydalanuvchi kattaroq so'radi (2026-10-31) */
  .c-c { text-align: center; font-size: 14.5px; margin-top: 2px; }
  .c-line { border-top: 3px dashed #000; margin: 6px 0; }
  .c-line--thin { border-top: 2px dotted #000; margin: 4px 0; }
  .c-row { display: flex; justify-content: space-between; gap: 6px; padding: 1px 0; }
  .c-row > span:last-child { white-space: nowrap; text-align: right; }   /* raqam, sana, summa hech qachon bo'linmasin */
  .c-title { font-size: 16px; font-weight: 900; }
  .c-stamp { text-align: center; font-size: 19px; font-weight: 900; border: 3px solid #000; padding: 3px; margin: 4px 0; letter-spacing: 1px; }
  .c-kv { display: flex; gap: 6px; padding: 1px 0; } .c-kv > span:first-child { min-width: 23mm; }
  .c-kv > b, .c-kv > span:last-child { flex: 1; word-break: break-word; }
  .c-kv > b { font-size: 16.5px; }
  .c-th { display: flex; justify-content: space-between; font-size: 14px; font-weight: 900; border-bottom: 3px solid #000; padding-bottom: 3px; margin-bottom: 4px; }
  .c-turkum { font-size: 13.5px; font-weight: 900; text-transform: uppercase; letter-spacing: .5px; margin: 6px 0 1px; padding-bottom: 1px; border-bottom: 2px solid #000; }
  .c-item { padding: 3px 0; }
  .c-item-n { font-size: 16.5px; font-weight: 900; word-break: break-word; }
  .c-item-r { display: flex; justify-content: space-between; gap: 8px; padding-left: 10px; font-size: 15px; }
  .c-item-r b { font-size: 16.5px; }
  .c-sub { font-size: 14.5px; }
  .c-jami { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; font-size: 23px; font-weight: 900; border-top: 3px solid #000; border-bottom: 3px solid #000; padding: 4px 0; margin: 5px 0; -webkit-text-stroke: .8px #000; }
  .c-qarz { font-size: 16.5px; } .c-qarz b { font-size: 17.5px; }
  .c-izoh { font-size: 14.5px; white-space: pre-wrap; }
  .c-imzo { display: flex; align-items: flex-end; gap: 8px; margin-top: 14px; font-size: 14.5px; }
  .c-chiziq { flex: 1; border-bottom: 3px solid #000; height: 12px; }
  .c-foot { text-align: center; margin-top: 12px; font-size: 15px; }
</style></head><body>${list.map((a) => bittaChek(a, firma)).join('')}</body></html>`
}

/** Yashirin iframe orqali chop etish (popup bloklanmaydi). Chop oynasi yopilgach iframe olib tashlanadi. */
export function chekChop(arizalar, firma = {}) {
  const html = chekHtml(arizalar, firma)
  const f = document.createElement('iframe')
  f.setAttribute('aria-hidden', 'true')
  f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;'
  document.body.appendChild(f)
  const d = f.contentDocument || f.contentWindow.document
  d.open(); d.write(html); d.close()
  const w = f.contentWindow
  const tozala = () => setTimeout(() => f.remove(), 500)
  w.onafterprint = tozala
  // Shriftlar/renderlash tugashini kutib chop etamiz; afterprint kelmasa ham 60 s dan keyin tozalanadi
  setTimeout(() => { try { w.focus(); w.print() } catch { tozala() } }, 150)
  setTimeout(() => { if (document.body.contains(f)) f.remove() }, 60000)
}
