/* API manzili.
 *
 * Ishlab chiqarishda (nginx orqasida) BASE bo'sh bo'ladi — brauzer
 * so'rovni sahifa turgan hostga yuboradi va nginx uni backend'ga
 * uzatadi. Shunday qilib manzil qattiq yozilmaydi va bir build
 * har qanday domen/portda ishlaydi.
 *
 * Dev rejimida Vite proxy'si /api ni localhost:3003 ga uzatadi.
 * VITE_API_BASE bilan istalgan manzilni majburlash mumkin. */
export const BASE = import.meta.env.VITE_API_BASE ?? '/api/v1'

function getToken() {
  try {
    const raw = localStorage.getItem('sellz_auth')
    return raw ? JSON.parse(raw).token : null
  } catch {
    return null
  }
}

/* So'rovni bekor qilish (qidiruv, sahifadan chiqish).
 * signalBilan(signal, () => api.get(...)) — fn ichida SINXRON boshlangan har bir so'rov shu signalni oladi,
 * shuning uchun nomli API'lar (arizaApi.getAll va h.k.) imzosini o'zgartirish shart emas. */
let joriySignal = null
export function signalBilan(signal, fn) {
  const eski = joriySignal
  joriySignal = signal
  try { return fn() } finally { joriySignal = eski }
}
/** Bekor qilingan so'rov xatosi — foydalanuvchiga ko'rsatilmaydi */
export const bekorXatomi = (e) => e?.name === 'AbortError'

/* Spravochniklar keshi — kichik, kam o'zgaradigan ro'yxatlar har sahifada qayta so'ralmasin.
 *  - Faqat pastdagi ro'yxatdagi GET manzillar; javob 60 soniya saqlanadi.
 *  - Bir vaqtda kelgan bir xil so'rovlar bitta tarmoq so'roviga birlashadi.
 *  - Har qanday yozish (POST/PATCH/PUT/DELETE) keshni to'liq tozalaydi — o'zgarish darhol ko'rinadi.
 *  - Har chaqiruvchiga alohida nusxa beriladi (sahifa obyektni o'zgartirsa kesh buzilmaydi).
 *  - Chiqish/boshqa foydalanuvchi: token kalitga kiradi. */
const KESH_MUDDAT = 60_000
const KESHLANADIGAN = new Set([
  // '/arizalar/spravochnik' ataylab yo'q: unda tovar qoldig'i bor — buyurtma formasi doim yangisini olsin
  '/mijozlar/spravochnik', '/agents/spravochnik', '/ishlab/spravochnik',
  '/hisobot/agentlar', '/xarajatlar/turlar', '/turkumlar', '/sozlama/kurs', '/sozlama/chek',
])
const kesh = new Map()   // kalit → { vaqt, promise }
export function keshTozala() { kesh.clear() }
const nusxa = (d) => (d === null || typeof d !== 'object' ? d : typeof structuredClone === 'function' ? structuredClone(d) : JSON.parse(JSON.stringify(d)))

function request(path, options = {}) {
  const usul = (options.method || 'GET').toUpperCase()
  if (usul !== 'GET') { kesh.clear(); return sorov(path, options) }
  // Bekor qilinadigan so'rov (qidiruv) keshlanmaydi — bekor bo'lsa boshqalarga xato tarqalmasin
  if (!KESHLANADIGAN.has(path) || options.signal || joriySignal) return sorov(path, options)
  const kalit = `${getToken() || ''}|${path}`
  const bor = kesh.get(kalit)
  if (bor && Date.now() - bor.vaqt < KESH_MUDDAT) return bor.promise.then(nusxa)
  const yozuv = { vaqt: Date.now(), promise: sorov(path, options) }
  kesh.set(kalit, yozuv)
  yozuv.promise.catch(() => { if (kesh.get(kalit) === yozuv) kesh.delete(kalit) })   // xato keshlanmaydi
  return yozuv.promise.then(nusxa)
}

async function sorov(path, options = {}) {
  const token = getToken()
  const signal = options.signal ?? joriySignal ?? undefined
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  })

  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* ignore */ }

  if (res.status === 401) {
    // Token muddati tugagan yoki noto'g'ri — global event yuboramiz
    window.dispatchEvent(new CustomEvent('sellz:session-expired'))
    throw new Error('session_expired')
  }

  if (!res.ok) throw xatoYasa(res, data)
  return data
}

/* Server xatosi → Error. 400/403/409/429 — foydalanuvchiga ko'rsatiladigan xabar (403 logout QILMAYDI, faqat 401).
 * err.status va err.errors ([{ msg, param }]) — forma xatoni maydon yonida ko'rsatishi uchun. */
function xatoYasa(res, data) {
  // Sequelize/Joi xatolari — eng ma'lumotli xabarni topamiz
  const msg =
    data?.errors?.[0]?.msg ??       // Joi validation
    data?.errors?.[0]?.message ??   // Sequelize validation
    data?.message ??                // oddiy xato
    `Server xatosi (${res.status})`
  const err = new Error(msg)
  err.status = res.status
  err.errors = Array.isArray(data?.errors) ? data.errors : []
  return err
}

/* Fayl yuborish (multipart/form-data) — Content-Type'ni brauzer o'zi qo'yadi (boundary bilan) */
async function upload(path, formData, method = 'POST') {
  kesh.clear()   // yozish — spravochnik keshi eskiradi
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, { method, body: formData, headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* ignore */ }
  if (res.status === 401) { window.dispatchEvent(new CustomEvent('sellz:session-expired')); throw new Error('session_expired') }
  if (!res.ok) throw xatoYasa(res, data)
  return data
}

/* Fayl yuklab olish (xlsx, pdf …) — token bilan so'rab, brauzerda saqlash oynasini ochadi */
async function yuklabOl(path, faylNomi) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  if (res.status === 401) { window.dispatchEvent(new CustomEvent('sellz:session-expired')); throw new Error('session_expired') }
  if (!res.ok) {
    // Xato javobi JSON bo'ladi — backend xabarini ko'rsatamiz
    let data = null
    try { data = await res.json() } catch { /* ignore */ }
    throw xatoYasa(res, data)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = faylNomi; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/* Biriktirilgan fayl (chek, audit rasmi) — /uploads endi token talab qiladi, shuning uchun <img src>/<a href> ishlamaydi.
 * Fayl Bearer bilan blob qilib olinadi va yangi oynada ochiladi (brauzer ochmasa — yuklab olinadi).
 * Oyna foydalanuvchi bosishi bilan SINXRON ochiladi, aks holda brauzer uni bloklaydi. */
const API_ILDIZ = String(BASE).replace(/\/api\/v1\/?$/, '')
const RASM_KENG = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']
export const faylTuri = (yol) => {
  const k = String(yol || '').split('?')[0].split('.').pop().toLowerCase()
  return RASM_KENG.includes(k) ? 'rasm' : k ? k.toUpperCase() : ''
}
export async function faylniOch(yol, nomi = 'chek') {
  if (!yol) return
  const oyna = window.open('', '_blank')
  try {
    const token = getToken()
    const manzil = /^https?:/.test(yol) ? yol : API_ILDIZ + yol
    const res = await fetch(manzil, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (res.status === 401) { window.dispatchEvent(new CustomEvent('sellz:session-expired')); throw new Error('session_expired') }
    if (!res.ok) throw new Error(res.status === 404 ? 'Fayl topilmadi' : `Faylni ochib bo'lmadi (${res.status})`)
    const url = URL.createObjectURL(await res.blob())
    if (oyna) oyna.location.href = url
    else { const a = document.createElement('a'); a.href = url; a.download = `${nomi}.${String(yol).split('.').pop()}`; document.body.appendChild(a); a.click(); a.remove() }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (e) { oyna?.close(); throw e }
}

export const api = {
  get:    (path, options)     => request(path, options),
  upload: (path, formData, method) => upload(path, formData, method),
  yukla:  (path, faylNomi)    => yuklabOl(path, faylNomi),
  post:   (path, body)        => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  patch:  (path, body)        => request(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  put:    (path, body)        => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  /** body ixtiyoriy — masalan tasdiqlangan prixodni o'chirishda { parol } */
  delete: (path, body)        => request(path, { method: 'DELETE', ...(body !== undefined ? { body: JSON.stringify(body) } : {}) }),
}

/* ── Dashboard API ─────────────────────────────────────── */
export const dashboardApi = {
  /** Bosh sahifa uchun barcha statistika */
  main: (period = 'month') => request(`/dashboard?period=${period}`),
}

/* ── Mobil hisobotlar API (audit, sotmaslik, agent savdo, marshrut) ── */
export const hisobotApi = {
  agentlar:   ()             => request('/hisobot/agentlar'),
  audit:      (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/audit${q ? '?' + q : ''}`) },
  sotmaslik:  (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/sotmaslik${q ? '?' + q : ''}`) },
  agentSavdo: (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/agent-savdo${q ? '?' + q : ''}`) },
  marshrut:   (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/marshrut${q ? '?' + q : ''}`) },
  inkassatsiya:      (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/inkassatsiya${q ? '?' + q : ''}`) },
  inkassatsiyaTopshir: (body)      => request('/hisobot/inkassatsiya', { method: 'POST', body: JSON.stringify(body) }),
  // Kamomadni keyinroq qabul qilish — summa o'sha kunning topshirilganiga QO'SHILADI (kamomaddan oshmaydi)
  inkassatsiyaKamomad: (body)      => request('/hisobot/inkassatsiya/kamomad', { method: 'POST', body: JSON.stringify(body) }),
  inkassatsiyaHisobot: (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/inkassatsiya-hisobot${q ? '?' + q : ''}`) },
  marshrutReja:        (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/marshrut-reja${q ? '?' + q : ''}`) },
  marshrutRejaBelgila: (body)        => request('/hisobot/marshrut-reja', { method: 'POST', body: JSON.stringify(body) }),
  marshrutRejaOchir:   (id)          => request(`/hisobot/marshrut-reja/${id}`, { method: 'DELETE' }),
  marshrutRejaGenerate:(body)        => request('/hisobot/marshrut-reja/generate', { method: 'POST', body: JSON.stringify(body) }),
  planFact:            (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/plan-fact${q ? '?' + q : ''}`) },
  /** Agentlar hozir qayerda — real vaqt xaritasi */
  agentOnline:         (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/agent-online${q ? '?' + q : ''}`) },
  /** Agent nazorati: tashrif jurnali + reja-fakt + KPI + anomaliyalar */
  agentMonitoring:     (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/agent-monitoring${q ? '?' + q : ''}`) },
  /** Kunlik marshrut — agent qayerga borgani (xarita uchun) */
  agentMarshrut:       (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/agent-marshrut${q ? '?' + q : ''}`) },
  tovarHisobot:        (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/tovar-hisobot${q ? '?' + q : ''}`) },
  tovarHisobotDetail:  (tovarId, params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/tovar-hisobot/${tovarId}${q ? '?' + q : ''}`) },
  qoldiqlar:           (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/qoldiqlar${q ? '?' + q : ''}`) },
  qoldiqDetail:        (tovarId, params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/qoldiqlar/${tovarId}/detail${q ? '?' + q : ''}`) },
  ombor:               (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/ombor${q ? '?' + q : ''}`) },
  omborKpi:            (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/ombor-kpi${q ? '?' + q : ''}`) },
  omborTrend:          (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/ombor-trend${q ? '?' + q : ''}`) },
  omborAylanish:       (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/ombor-aylanish${q ? '?' + q : ''}`) },
  omborJurnal:         (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/ombor-jurnal${q ? '?' + q : ''}`) },
  register:            (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/register${q ? '?' + q : ''}`) },
  sotuvHisobot:        (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/sotuv-hisobot${q ? '?' + q : ''}`) },
  registerKpi:         (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/register-kpi${q ? '?' + q : ''}`) },
  turkum:              (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/hisobot/turkum${q ? '?' + q : ''}`) },
}

/* ── Tahlil API — Hisobotlar bo'limi (/api/v1/tahlil). Davr: { dan, gacha } YYYY-MM-DD ── */
const tq = (path, params = {}) => {
  const p = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined))
  const q = new URLSearchParams(p).toString()
  return request(`/tahlil/${path}${q ? '?' + q : ''}`)
}
/* Ishlab chiqarish: qoralama → boshlash (xom ashyo chiqadi) → yakunlash (mahsulot omborga, tannarx) */
export const ishlabApi = {
  getAll:      (params = {}) => { const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString(); return request(`/ishlab${q ? '?' + q : ''}`) },
  getById:     (id)         => request(`/ishlab/${id}`),
  spravochnik: ()           => request('/ishlab/spravochnik'),
  create:      (data)       => request('/ishlab', { method: 'POST', body: JSON.stringify(data) }),
  update:      (id, data)   => request(`/ishlab/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  boshla:      (id, data = {}) => request(`/ishlab/${id}/boshla`, { method: 'POST', body: JSON.stringify(data) }),
  yakunla:     (id, data = {}) => request(`/ishlab/${id}/yakunla`, { method: 'POST', body: JSON.stringify(data) }),
  bekor:       (id, sabab)  => request(`/ishlab/${id}/bekor`, { method: 'POST', body: JSON.stringify({ sabab }) }),
  nusxa:       (id)         => request(`/ishlab/${id}/nusxa`, { method: 'POST', body: '{}' }),
  /** Noto'g'ri omborda turgan qoldiq (asosiy skladdagi xom ashyo va h.k.) → turi omboriga */
  tartibla:    ()           => request('/ishlab/tartibla', { method: 'POST', body: '{}' }),
}

export const tahlilApi = {
  biznes:         (p) => tq('biznes', p),
  umumiy:         (p) => tq('umumiy', p),
  sotuv:          (p) => tq('sotuv', p),
  tovarlar:       (p) => tq('tovarlar', p),
  qarzlar:        (p) => tq('qarzlar', p),
  ombor:          (p) => tq('ombor', p),
  kirim:          (p) => tq('kirim', p),
  yetkazuvchilar: (p) => tq('yetkazuvchilar', p),
  jurnal:         (p) => tq('jurnal', p),
  xodim:          (p) => tq('xodim', p),
  reyting:        (p) => tq('reyting', p),   // mijozlar reytingi (bosh sahifa bloki va hisobot)
}

/* ── Sozlama API (global tizim sozlamalari — dollar kursi va h.k.) ────── */
export const sozlamaApi = {
  getKurs:    ()      => request('/sozlama/kurs'),
  updateKurs: (kurs)  => request('/sozlama/kurs', { method: 'PATCH', body: JSON.stringify({ kurs }) }),
  /** Chek (80 mm) rekvizitlari: { nomi, telefon, manzil, izoh } */
  getChek:    ()      => request('/sozlama/chek'),
  updateChek: (body)  => request('/sozlama/chek', { method: 'PATCH', body: JSON.stringify(body) }),
  /** O'chirish paroli (tasdiqlangan kirim hujjatini o'chirish uchun), faqat Admin */
  /** Mijoz reytingi ballari: { buyurtma, rad_etildi, tolov_surildi, tolov_qabul, kritik_soni } */
  getReyting:       ()      => request('/sozlama/reyting'),
  updateReyting:    (body)  => request('/sozlama/reyting', { method: 'PATCH', body: JSON.stringify(body) }),
  getXavfsizlik:    ()      => request('/sozlama/xavfsizlik'),
  updateXavfsizlik: (body)  => request('/sozlama/xavfsizlik', { method: 'PATCH', body: JSON.stringify(body) }),
}

/* ── Kassa API (pul oqimi hisoboti) ────────────────────── */
export const kassaApi = {
  /** Hisobot: kirim/chiqim ro'yxati + jami + kategoriyalar */
  hisobot: (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/kassa${q ? '?' + q : ''}`) },
  /** Umumiy qoldiq KPI */
  kpi:     ()            => request('/kassa/kpi'),
  /** Qo'lda kirim/chiqim yoki mijoz to'lovi */
  create:  (body)        => request('/kassa', { method: 'POST', body: JSON.stringify(body) }),
  /** O'chirish (faqat qo'lda kiritilgan) */
  delete:  (id)          => request(`/kassa/${id}`, { method: 'DELETE' }),
}

/* ── Ariza API ─────────────────────────────────────────── */
export const arizaApi = {
  /** Ro'yxat (filter, pagination) */
  getAll:       (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/arizalar${q ? '?' + q : ''}`) },
  /** Bitta ariza */
  getById:      (id)          => request(`/arizalar/${id}`),
  /** Yangi ariza yaratish */
  create:       (body)        => request('/arizalar', { method: 'POST',   body: JSON.stringify(body) }),
  /** Tahrirlash */
  update:       (id, body)    => request(`/arizalar/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  /** O'chirish */
  delete:       (id)          => request(`/arizalar/${id}`, { method: 'DELETE' }),
  /** Holat o'zgartirish (asosiy jarayon) */
  changeHolat:  (id, body)    => request(`/arizalar/${id}/holat`, { method: 'PATCH', body: JSON.stringify(body) }),
  /** Bir hududdagi bir nechta zakazni bitta dostavchiga berib, birga yo'lga chiqarish */
  topluYolda:   (body)        => request('/arizalar/toplu-yolda', { method: 'PATCH', body: JSON.stringify(body) }),
  /** KPI statistika */
  statistika:   (kanal)       => request('/arizalar/statistika' + (kanal ? `?kanal=${kanal}` : '')),
  /** Spravochnik: mijozlar, agentlar, tovarlar, omborlar */
  spravochnik:  ()            => request('/arizalar/spravochnik'),
}

/* ── Dostavchi API (buyurtma yetkazuvchi haydovchilar) ──── */
export const dostavchiApi = {
  /** Barcha dostavchilar (aktiv buyurtmalar soni bilan) */
  getAll:     (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/dostavchilar${q ? '?' + q : ''}`) },
  /** Bitta dostavchi */
  getById:    (id)          => request(`/dostavchilar/${id}`),
  /** Dostavchi rejasi/marshruti — turi=aktiv|tarix|barcha */
  reja:       (id, params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/dostavchilar/${id}/reja${q ? '?' + q : ''}`) },
  /** Dostavchi statistikasi */
  statistika: (id)          => request(`/dostavchilar/${id}/statistika`),
  /** Dostavchi kassasi: shu kuni yig'gan naqd, topshirgani, farq (sana=YYYY-MM-DD) */
  kassa:      (id, sana)    => request(`/dostavchilar/${id}/kassa${sana ? '?sana=' + sana : ''}`),
  /** Kassir dostavchikdan naqdni qabul qildi */
  kassaQabul: (id, body)    => request(`/dostavchilar/${id}/kassa-qabul`, { method: 'POST', body: JSON.stringify(body) }),
  /** Mijoz koordinatasiga qarab dostavchi tavsiyasi (joriy joylashuv + masofa + band-emaslik) */
  tavsiya:    (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/dostavchilar/tavsiya${q ? '?' + q : ''}`) },
  /** Hudud bo'yicha tavsiya — arizaning hududidagi barcha tayyor zakazlar + mos dostavchilar */
  hududTavsiya: (arizaId)   => request(`/dostavchilar/hudud-tavsiya?ariza_id=${arizaId}`),
  /** Yaratish */
  create:     (body)        => request('/dostavchilar', { method: 'POST', body: JSON.stringify(body) }),
  /** Yangilash */
  update:     (id, body)    => request(`/dostavchilar/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  /** Faol/nofaol toggle */
  toggleFaol: (id)          => request(`/dostavchilar/${id}/faol`, { method: 'PATCH', body: '{}' }),
  /** O'chirish */
  delete:     (id)          => request(`/dostavchilar/${id}`, { method: 'DELETE' }),
}

/* ── Trip Sheet API (dostavchik kunlik marshrut varag'i) ── */
export const tripSheetApi = {
  getAll:      (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/trip-sheet${q ? '?' + q : ''}`) },
  getById:     (id)          => request(`/trip-sheet/${id}`),
  create:      (body)        => request('/trip-sheet', { method: 'POST', body: JSON.stringify(body) }),
  addArizalar: (id, ariza_idlar) => request(`/trip-sheet/${id}/arizalar`, { method: 'POST', body: JSON.stringify({ ariza_idlar }) }),
  removeAriza: (id, arizaId) => request(`/trip-sheet/${id}/arizalar/${arizaId}`, { method: 'DELETE' }),
  tayinlanmagan: (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/trip-sheet/tayinlanmagan${q ? '?' + q : ''}`) },
  qaytarish:   (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/trip-sheet/qaytarish${q ? '?' + q : ''}`) },
}

/* ── Avtolavka API (ko'chma savdo: yuklash → sotuv → qabul → solishtirma) ── */
const qs = (params = {}) => { const q = new URLSearchParams(params).toString(); return q ? '?' + q : '' }

/* Kassalar, plastik to'lovlar navbati, agent naqd/karta topshiruvlari (backend §17–19).
 * Ruxsat: ko'rish — moliya:view, kassa CRUD — moliya:create, tasdiq/rad/tahrir — moliya:approve. */
const j = (method, body) => ({ method, body: JSON.stringify(body ?? {}) })
export const kassalarApi = {
  list:        (params = {}) => request(`/kassalar${qs(params)}`),
  getById:     (id)          => request(`/kassalar/${id}`),
  viloyatlar:  ()            => request('/kassalar/viloyatlar'),
  create:      (body)        => request('/kassalar', j('POST', body)),
  update:      (id, body)    => request(`/kassalar/${id}`, j('PATCH', body)),
  faol:        (id, faol)    => request(`/kassalar/${id}/faol`, j('PATCH', { faol })),
  remove:      (id)          => request(`/kassalar/${id}`, { method: 'DELETE' }),
  /** Agentlar qo'lidagi pul: [{ id, fullname, territoriya_id, super_agent_id, faol, pul }] */
  agentlar:    (params = {}) => request(`/kassalar/agentlar${qs(params)}`),
  /** Chek fayli (rasm yoki pdf/doc/docx/xls/xlsx, ≤10 MB) → { chekRasm, nomi, hajm, tur } */
  chekYuklash: (fayl)        => { const fd = new FormData(); fd.append('chek', fayl, fayl.name); return upload('/kassalar/chek-yuklash', fd) },
  plastik: {
    list:     (params = {}) => request(`/kassalar/plastik-tolovlar${qs(params)}`),
    getById:  (id)          => request(`/kassalar/plastik-tolovlar/${id}`),
    tasdiqla: (id, body)    => request(`/kassalar/plastik-tolovlar/${id}/tasdiqla`, j('POST', body)),
    rad:      (id, body)    => request(`/kassalar/plastik-tolovlar/${id}/rad`, j('POST', body)),
    update:   (id, body)    => request(`/kassalar/plastik-tolovlar/${id}`, j('PATCH', body)),
  },
  topshiruv: {
    list:     (params = {}) => request(`/kassalar/topshiruvlar${qs(params)}`),
    getById:  (id)          => request(`/kassalar/topshiruvlar/${id}`),
    tasdiqla: (id, body)    => request(`/kassalar/topshiruvlar/${id}/tasdiqla`, j('POST', body)),
    rad:      (id, body)    => request(`/kassalar/topshiruvlar/${id}/rad`, j('POST', body)),
  },
}

export const avtolavkaApi = {
  /** Boshqaruv markazi: har mashina, bitta kun (sana=YYYY-MM-DD) */
  doska:           (params = {}) => request(`/avtolavka/doska${qs(params)}`),
  /** Agent × kun holat matritsasi (kun=14) */
  kalendar:        (params = {}) => request(`/avtolavka/kalendar${qs(params)}`),
  /** Ertalabki yuklash taklifi (o'rtacha sotuv + zaxira − qoldiq) */
  tavsiya:         (params = {}) => request(`/avtolavka/tavsiya${qs(params)}`),
  /** Avtolavka rejimidagi agentlar + mashinadagi qoldiq */
  agentlar:        ()            => request('/avtolavka/agentlar'),
  /** Asosiy ombordagi tovarlar (yuklash formasi uchun) */
  tovarlar:        (params = {}) => request(`/avtolavka/tovarlar${qs(params)}`),
  /** Hujjatlar ro'yxati: tur=yuklash|qabul, agent_id, date_from, date_to, holat */
  hujjatlar:       (params = {}) => request(`/avtolavka/hujjatlar${qs(params)}`),
  hujjat:          (id)          => request(`/avtolavka/hujjatlar/${id}`),
  yuklashCreate:   (body)        => request('/avtolavka/yuklash', { method: 'POST', body: JSON.stringify(body) }),
  yuklashUpdate:   (id, body)    => request(`/avtolavka/yuklash/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  yuklashTasdiqla: (id)          => request(`/avtolavka/yuklash/${id}/tasdiqla`, { method: 'PATCH', body: '{}' }),
  /** Agentning mobil so'rovini rad etish: { sabab } — agent ilovada ko'radi */
  yuklashRad:      (id, body = {}) => request(`/avtolavka/yuklash/${id}/rad`, { method: 'PATCH', body: JSON.stringify(body) }),
  yuklashDelete:   (id)          => request(`/avtolavka/yuklash/${id}`, { method: 'DELETE' }),
  /** Agent omborida hozir turgan tovar (qabul uchun kutilayotgan ro'yxat) */
  qoldiq:          (agent_id)    => request(`/avtolavka/qoldiq?agent_id=${agent_id}`),
  qabulCreate:     (body)        => request('/avtolavka/qabul', { method: 'POST', body: JSON.stringify(body) }),
  /** Bugun yopilgan kunni qayta ochish — bir kunda yangi reys: { agent_id } */
  kunQaytaOch:     (body)        => request('/avtolavka/kun/qayta-och', { method: 'POST', body: JSON.stringify(body) }),
  /** Bir agent, bir kun: tovar + pul balansi, tafsilot bilan */
  solishtirma:     (params = {}) => request(`/avtolavka/solishtirma${qs(params)}`),
  /** Kunlar bo'yicha qisqa solishtirma */
  kunlar:          (params = {}) => request(`/avtolavka/kunlar${qs(params)}`),
  /** Sotuvdan qaytarishlar tarixi: dan, gacha, agent_id, mijoz_id, viloyat_id, page, limit */
  qaytarishlar:    (params = {}) => request(`/avtolavka/qaytarishlar${qs(params)}`),
  qaytarish:       (id)          => request(`/avtolavka/qaytarishlar/${id}`),
  /** Mashinadan sotuvlar jurnali: dan, gacha, agent_id, search, tolov=naqd|qarz, page */
  sotuvlar:        (params = {}) => request(`/avtolavka/sotuvlar${qs(params)}`),
  /** Sotuv qilish formasi: xodim mashinasidagi tovar, mijoz narxlari, mijoz qarzi, kun holati */
  sotuvTayyor:     (params = {}) => request(`/avtolavka/sotuv/tayyor${qs(params)}`),
  /** Xodim nomidan sotuv (mobil sotuv bilan bir xil: mashina, kassa, qarz, bonus) */
  sotuvCreate:     (body)        => request('/avtolavka/sotuv', { method: 'POST', body: JSON.stringify(body) }),
  /** Takror/xato chekni bekor qilish (faqat Admin): ombor, kassa, mijoz qarzi, bonus teskari yoziladi */
  sotuvBekor:      (id, body)    => request(`/avtolavka/sotuv/${id}/bekor`, { method: 'POST', body: JSON.stringify(body) }),
}

/* ── Agent API ─────────────────────────────────────────── */
export const agentApi = {
  /** Agent pul daftari: { agent, pul, davr, tarix } — dan, gacha, limit */
  pul:         (id, params = {}) => request(`/agents/${id}/pul${qs(params)}`),
  /** Barcha agentlar (statistika bilan) */
  getAll:       (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/agents${q ? '?' + q : ''}`)
  },
  /** Bitta agent (mijozlari bilan) */
  getById:      (id, params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/agents/${id}${q ? '?' + q : ''}`)
  },
  /** Agent mijozlari */
  getMijozlar:  (id, params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/agents/${id}/mijozlar${q ? '?' + q : ''}`)
  },
  /** Agent savdo registri (plan-fakt-bonus tarixi) */
  register:     (id, period = 'month') => request(`/agents/${id}/register?period=${period}`),
  /** Spravochnik (agentlar + territoriyalar ro'yxati) */
  spravochnik:  ()         => request('/agents/spravochnik'),
  /** Umumiy statistika */
  statistika:   (period)   => request(`/agents/statistika?period=${period || 'month'}`),
  /** Agent yaratish */
  create:       (body)     => request('/agents', { method: 'POST',   body: JSON.stringify(body) }),
  /** Agent yangilash */
  update:       (id, body) => request(`/agents/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  /** Agent o'chirish */
  delete:       (id)       => request(`/agents/${id}`, { method: 'DELETE' }),
  /** Faol/nofaol toggle */
  toggleFaol:   (id)       => request(`/agents/${id}/faol`, { method: 'PATCH', body: '{}' }),
}

/* ── Turkumlar (Sozlamalar → Turkumlar): tovar turkumlari va tovar biriktirish ── */
export const turkumApi = {
  /** Ro'yxat (+tovar_soni). params: { faol: 'true'|'false', search } */
  getAll:   (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/turkumlar${q ? '?' + q : ''}`) },
  /** Turkum + tovarlari */
  getById:  (id)          => request(`/turkumlar/${id}`),
  /** Biriktirish uchun boshqa / turkumsiz tovarlar */
  tanlash:  (id, search = '') => request(`/turkumlar/${id}/tanlash${search ? '?search=' + encodeURIComponent(search) : ''}`),
  create:   (body)        => request('/turkumlar', { method: 'POST', body: JSON.stringify(body) }),
  /** Nom o'zgarsa tovar va hujjatlardagi nom ham yangilanadi */
  update:   (id, body)    => request(`/turkumlar/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  toggleFaol: (id)        => request(`/turkumlar/${id}/faol`, { method: 'PATCH', body: '{}' }),
  tartib:   (idlar)       => request('/turkumlar/tartib', { method: 'PATCH', body: JSON.stringify({ idlar }) }),
  /** { qoshish: [tovar_id], olib_tashlash: [tovar_id] } */
  tovarlar: (id, body)    => request(`/turkumlar/${id}/tovarlar`, { method: 'PATCH', body: JSON.stringify(body) }),
  /** Tovarlari bo'lsa kochir = boshqa turkum id */
  delete:   (id, kochir)  => request(`/turkumlar/${id}${kochir ? '?kochir=' + kochir : ''}`, { method: 'DELETE' }),
}
