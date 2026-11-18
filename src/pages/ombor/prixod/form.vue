<script setup>
import { ref, computed, reactive, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { api } from '../../../api/api.js'
import { sozlamaApi } from '../../../api/api.js'
import { notifStore } from '../../../stores/notif.js'
import NumberInput from '../../../components/NumberInput.vue'
import { authStore } from '../../../stores/auth'

// Tasdiqlangan hujjatda miqdor (kg) tuzatish faqat Admin uchun
const admin = computed(() => authStore.isAdmin.value)

// ─── Dollar kursi ─────────────────────────────────────────────────────────────
const kurs = ref(12650)
const kursEditing = ref(false)
const kursDraft   = ref('')
const kursSaving  = ref(false)

function openKursEdit() {
  kursDraft.value = String(kurs.value)
  kursEditing.value = true
}
function closeKursEdit() {
  kursEditing.value = false
}
async function saveKurs() {
  const val = Number(kursDraft.value)
  if (!val || val <= 0) return
  kursSaving.value = true
  try {
    const d = await sozlamaApi.updateKurs(val)
    kurs.value = d.kurs || val
    kursEditing.value = false
  } catch { /* ignore */ }
  finally { kursSaving.value = false }
}

const router = useRouter()
const route  = useRoute()

const isEdit  = computed(() => route.params.id && route.params.id !== 'yangi')
const docId   = computed(() => isEdit.value ? route.params.id : null)
const title   = computed(() => isEdit.value ? 'Prixodni tahrirlash' : 'Yangi kelish')

// ─── Header form ──────────────────────────────────────────────────────────────
const head = reactive({
  sana:              new Date().toISOString().slice(0, 16),
  yetkazuvchi:       '',
  yetkazuvchi_id:    null,
  tolov_turi:        null,
  tolangan_summa:    0,
  ombor:             'Основной склад',
  izoh:              '',
  qoshimcha_xarajat: 0,
})

// ─── Yetkazuvchilar ───────────────────────────────────────────────────────────
const yetkazuvchilar   = ref([])
const yetkazuvchiSearch = ref('')
const yetkazuvchiOpen  = ref(false)

const filteredYetkazuvchilar = computed(() => {
  const q = yetkazuvchiSearch.value.toLowerCase()
  return q ? yetkazuvchilar.value.filter(y => y.ism.toLowerCase().includes(q)) : yetkazuvchilar.value
})

function pickYetkazuvchi(y) {
  head.yetkazuvchi_id = y ? y.id   : null
  head.yetkazuvchi    = y ? y.ism  : ''
  yetkazuvchiOpen.value   = false
  yetkazuvchiSearch.value = ''
}

function clearYetkazuvchi() {
  head.yetkazuvchi_id  = null
  head.yetkazuvchi     = ''
  head.tolov_turi      = null
  head.tolangan_summa  = 0
}

const selectedYetkazuvchi = computed(() =>
  head.yetkazuvchi_id ? yetkazuvchilar.value.find(y => y.id === head.yetkazuvchi_id) : null
)

// ─── Column visibility ────────────────────────────────────────────────────────
const colVis = reactive({
  foto:         true,
  turkum:       true,
  tovar_kodi:   false,
  shtrix_kod:   false,
  ishlab_sana:  false,
  yaroqlilik:   false,
  qutilarda:    false,   // tovar kg'da — blok/quti ustunlari kerak bo'lsa ko'rinishdan yoqiladi
  bloklarda:    false,
  donada:       true,
  hajm:         false,
  ustama:       true,
  sotuv_narx:   true,
  summa:        true,
})
const colVisOpen = ref(false)
const COL_LABELS = {
  foto:        'Foto',
  turkum:      'Turkum',
  tovar_kodi:  'Tovar kodi',
  shtrix_kod:  'Shtrix-kod',
  ishlab_sana: 'Ishlab chiqarish sanasi',
  yaroqlilik:  'Yaroqlilik muddati',
  qutilarda:   'Qutilarda',
  bloklarda:   'Bloklarda',
  donada:      'Miqdor',
  hajm:        'Hajm',
  ustama:      'Ustama %',
  sotuv_narx:  'Sotish narxi',
  summa:       'Summa',
}

// ─── Custom select state ──────────────────────────────────────────────────────
const openSel = ref(null)
const SEL_OPTIONS = {
  ombor: [
    { value: 'Основной склад', label: 'Основной склад', icon: '🏪' },
    { value: 'Запасной склад', label: 'Запасной склад', icon: '🏬' },
  ],
}
function selLabel(group, val) {
  return SEL_OPTIONS[group].find(o => o.value === val)?.label ?? '—'
}
function pickSel(_group, field, val) {
  head[field] = val
  openSel.value = null
}
function toggleSel(key) {
  openSel.value = openSel.value === key ? null : key
}

// ─── Qatorlar ─────────────────────────────────────────────────────────────────
let qSeq = 0
const qatorlar = ref([])

function addQator(t = {}) {
  const blokdagi = Number(t.blokdagi) || 1
  const qutidagi = Number(t.qutidagi) || 1
  const donada   = Number(t.donada)   || 1
  const bloklarda= Number(t.bloklarda)|| 0
  const qutilarda= Number(t.qutilarda)|| 0
  const narx     = Number(t.narx)     || 0
  const total    = donada + bloklarda * blokdagi + qutilarda * blokdagi * qutidagi
  const row = {
    _id:                  ++qSeq,
    tovar_id:             t.tovar_id    || null,
    tovar_nomi:           t.tovar_nomi  || '',
    tovar_kodi:           t.shtrix_kod  || '',
    shtrix_kod:           t.shtrix_kod  || '',
    turkum:               t.turkum      || '',
    ishlab_chiqarish_sana:'',
    yaroqlilik_muddati:   '',
    narx,
    // Foydalanuvchi to'g'ridan-to'g'ri kiritgan tannarx (qo'shimcha xarajatsiz).
    // "Kirim narx" inputi (narx) qo'shimcha xarajat qo'shilganda shu asosdan
    // qayta hisoblanadi — aks holda xarajat bir necha marta ustma-ust qo'shilardi.
    _narxBase:            narx,
    narx_usd:             Number(t.narx_usd) || 0,
    // Bitta sotish narxi (optom/chakana ajratilmaydi) — backendga ikkalasiga ham shu yoziladi
    ustama:               0,
    sotuv_narx:           Number(t.chakana_narx || t.sotuv_narx || t.optom_narx) || 0,
    qutilarda,
    bloklarda,
    donada,
    hajm:                 Number(t.hajm) || 0,
    summa:                +(total * narx).toFixed(0),
    _olchov:              t.olchov      || 'kg',
    _blokdagi:            blokdagi,
    _qutidagi:            qutidagi,
    // Xom ashyo tasdiqlanganda savdo skladiga emas, "Xom ashyo ombori"ga tushadi (backend tovar turiga qarab)
    _xom:                 !!t._xom,
  }
  qatorlar.value.push(row)
  redistribyutsiyaXarajat()
}

function removeQator(id) {
  qatorlar.value = qatorlar.value.filter(q => q._id !== id)
  redistribyutsiyaXarajat()
}

// $ narx kiritilganda joriy kursga ko'paytirib so'm narxini avtomatik to'ldiradi
// (natija so'm bo'lgani uchun butun songa yaxlitlanadi)
function onNarxUsdInput(q) {
  q.narx = q.narx_usd > 0 ? Math.round(Number(q.narx_usd) * kurs.value) : q.narx
  q._narxBase = Number(q.narx) - donaXarajati()
  recalcSum(q)
}
// So'mda qo'lda tahrirlansa — $ qiymati endi mos kelmaydi, tozalaymiz
// (aks holda eskirgan $ qiymat saqlanib qolib chalkashlik keltirib chiqaradi).
// Foydalanuvchi "Kirim narx"ni qo'lda o'zgartirdi — bu YAKUNIY (xarajat qo'shilgan)
// qiymat sifatida qabul qilinadi, shundan joriy xarajat ulushi ayirilib _narxBase
// (asl tannarx) qayta hisoblanadi.
function onNarxInput(q) {
  q.narx_usd = 0
  q._narxBase = Number(q.narx) - donaXarajati()
  if (q.ustama > 0) applyUstama(q)
  recalcSum(q)
}

// Har bir DONAGA to'g'ri keladigan qo'shimcha xarajat (jami xarajat / jami dona) —
// barcha tovarlar uchun bir xil, dona soniga bog'liq emas. So'm qiymati bo'lgani
// uchun har doim butun songa yaxlitlanadi (kasr so'mda ishlatilmaydi).
function donaXarajati() {
  const xarajat  = Number(head.qoshimcha_xarajat) || 0
  const jamiDona = qatorlar.value.reduce((s, r) => s + jamiDonaQator(r), 0)
  if (xarajat <= 0 || jamiDona <= 0) return 0
  return Math.round(xarajat / jamiDona)
}
// Eng yaqin 100 so'mgacha yaxlitlash (masalan 11 364 -> 11 400) — "chiroyli" narx uchun
function roundTo100(v) {
  return Math.round(v / 100) * 100
}
// "Kirim narx" inputidagi ko'rinadigan qiymat — asl tannarx + dona boshiga xarajat,
// eng yaqin 100 so'mgacha yaxlitlangan
function applyXarajatToQator(q) {
  q.narx = roundTo100(Number(q._narxBase || 0) + donaXarajati())
}
// Qo'shimcha xarajat (yoki dona miqdori) o'zgarganda — BARCHA qatorlarga qayta taqsimlanadi
function redistribyutsiyaXarajat() {
  qatorlar.value.forEach(q => {
    applyXarajatToQator(q)
    recalcSum(q)
    if (q.ustama > 0) applyUstama(q)
  })
}
watch(() => head.qoshimcha_xarajat, redistribyutsiyaXarajat)
// Sotish narxi qo'lda tahrirlandi — endi ustama % orqali hisoblanmaydi, aks holda
// keyinchalik tannarx o'zgarganda qo'lda kiritilgan qiymat ustidan yozilardi.
function onSotuvNarxInput(q) {
  q.ustama = 0
}
// Ustama % kiritilganda: sotish narxi = tannarx (xarajat bilan) * (1 + ustama/100)
function onUstamaInput(q) {
  if (q.ustama > 0) applyUstama(q)
}
function applyUstama(q) {
  const narx = Number(q.narx) || 0
  const foiz = Number(q.ustama) || 0
  q.sotuv_narx = Math.round(narx * (1 + foiz / 100))
}

// Qutilarda/bloklarda/donada — UCHALASI HAM mustaqil, bir-birini bosib
// yozmaydi. Jami dona = bloklarda*blokdagi + qutilarda*blokdagi*qutidagi + donada
// (masalan 1 blok, blokda 12 dona + 3 dona qo'lda = jami 15 dona).
function jamiDonaQator(q) {
  const blokSoni = Number(q._blokdagi) || 1
  const qutiSoni = Number(q._qutidagi) || 1
  const blok     = Number(q.bloklarda) || 0
  const quti     = Number(q.qutilarda) || 0
  const dona     = Number(q.donada)    || 0
  return blok * blokSoni + quti * blokSoni * qutiSoni + dona
}

// bloklarda yoki qutilarda o'zgarganda → summa qayta hisoblanadi.
// Jami dona o'zgargani uchun qo'shimcha xarajat BARCHA qatorlar bo'yicha
// qayta taqsimlanadi (faqat shu qator emas).
function recalc(q) {
  redistribyutsiyaXarajat()
}

// narx to'g'ridan-to'g'ri o'zgarganda → faqat summa qayta hisoblanadi
function recalcSum(q) {
  const dona = jamiDonaQator(q)
  const narx = Number(q.narx) || 0
  q.summa = +(dona * narx).toFixed(0)
}
// donada maydoni to'g'ridan-to'g'ri (qo'lda) o'zgartirilganda — jami dona
// o'zgargani uchun qo'shimcha xarajat barcha qatorlarga qayta taqsimlanadi
function onDonadaInput(q) {
  redistribyutsiyaXarajat()
}

// ─── Inline "Nomi kiriting" row search ───────────────────────────────────────
const inlineSearch      = ref('')
const inlineResults     = ref([])
const inlineSearching   = ref(false)
const showInlineDrop    = ref(false)
const inlineInputRef    = ref(null)
let   inlineTimer       = null

watch(inlineSearch, (v) => {
  clearTimeout(inlineTimer)
  if (!v.trim()) { inlineResults.value = []; showInlineDrop.value = false; return }
  inlineTimer = setTimeout(async () => {
    inlineSearching.value = true
    try {
      const d = await api.get(`/tovar?search=${encodeURIComponent(v)}&limit=20`)
      inlineResults.value = d.data ?? []
      // Natija topilmasa ham dropdown ochiq qoladi — "Yangi tovar qo'shish"
      // tugmasi ko'rinishi uchun (topilmagan tovarni shu yerdan yaratish imkoni).
      showInlineDrop.value = true
    } finally { inlineSearching.value = false }
  }, 250)
})

// ─── Yangi tovar (katalogda yo'q) — inline yoki katalog modalidan qo'shish ────
const newTovarOpen  = reactive({ show: false, saving: false, error: '', from: 'inline' })
const newTovarForm  = reactive({ nomi: '', turkum: '', olchov_birligi: 'kg', blokdagi_soni: 1, turi: 'tovar' })
// Turkumlar ro'yxati (Sozlamalar → Turkumlar, faollari) — yangi nom yozilsa backend uni ochadi
const turkumRoyxati = ref([])
onMounted(async () => { try { const r = await api.get('/turkumlar?faol=true'); turkumRoyxati.value = (Array.isArray(r) ? r : []).map(t => t.nomi) } catch { /* bo'sh qoladi */ } })
const xomSoni = computed(() => qatorlar.value.filter(q => q._xom).length)

function openNewTovarModal() {
  newTovarForm.nomi = inlineSearch.value.trim()
  newTovarForm.turkum = ''
  newTovarForm.olchov_birligi = 'kg'
  newTovarForm.blokdagi_soni = 1
  newTovarForm.turi = 'tovar'
  newTovarOpen.error = ''
  newTovarOpen.from = 'inline'
  newTovarOpen.show = true
  showInlineDrop.value = false
}

// Katalog modalida qidiruv natijasi bo'sh bo'lsa, shu yerdan yangi tovar yaratish
function openNewTovarModalFromCatalog() {
  newTovarForm.nomi = catalogSearch.value.trim()
  newTovarForm.turkum = ''
  newTovarForm.olchov_birligi = 'kg'
  newTovarForm.blokdagi_soni = 1
  newTovarForm.turi = 'tovar'
  newTovarOpen.error = ''
  newTovarOpen.from = 'catalog'
  newTovarOpen.show = true
}

async function saveNewTovar() {
  if (!newTovarForm.nomi.trim()) { newTovarOpen.error = 'Nomi majburiy'; return }
  newTovarOpen.saving = true
  newTovarOpen.error = ''
  try {
    const created = await api.post('/tovar', {
      nomi:           newTovarForm.nomi.trim(),
      turkum:         newTovarForm.turkum || null,
      olchov_birligi: newTovarForm.olchov_birligi || 'kg',
      blokdagi_soni:  Number(newTovarForm.blokdagi_soni) || 1,
      turi:           newTovarForm.turi,
    })
    addQator(tovarToQator(created))
    newTovarOpen.show = false
    if (newTovarOpen.from === 'inline') {
      inlineSearch.value = ''
      inlineResults.value = []
      nextTick(() => inlineInputRef.value?.focus())
    } else {
      // Katalog modalidan yaratilgan bo'lsa — modalni yopib, ro'yxatni yangilaymiz,
      // shunda yangi tovar endi katalogda ham ko'rinadi.
      catalogSearch.value = ''
      catalogOpen.value = false
    }
  } catch (e) {
    newTovarOpen.error = e.message || 'Saqlab bo\'lmadi'
  } finally {
    newTovarOpen.saving = false
  }
}

function tovarToQator(t) {
  return {
    tovar_id:   t.id,
    tovar_nomi: t.nomi,
    shtrix_kod: t.shtrix_kod          || '',
    turkum:     t.turkum              || '',
    hajm:       Number(t.hajm)        || 0,
    olchov:     t.olchov_birligi      || 'kg',
    blokdagi:   Number(t.blokdagi_soni)    || 1,
    qutidagi:   Number(t.qutidagi_bloklar) || 1,
    _xom:       t.turi === 'xom_ashyo',
    donada:     1,
    bloklarda:  0,
    qutilarda:  0,
    narx:       0,
  }
}

function pickInline(t) {
  addQator(tovarToQator(t))
  inlineSearch.value   = ''
  inlineResults.value  = []
  showInlineDrop.value = false
  nextTick(() => inlineInputRef.value?.focus())
}

function onInlineBlur() {
  setTimeout(() => { showInlineDrop.value = false }, 200)
}

// ─── Catalog modal ────────────────────────────────────────────────────────────
const catalogOpen      = ref(false)
const catalogSearch    = ref('')
const catalogResults   = ref([])
const catalogLoading   = ref(false)
const catalogSelected  = ref(new Set())
let   catalogTimer     = null

async function openCatalog() {
  catalogOpen.value     = true
  catalogSearch.value   = ''
  catalogSelected.value = new Set()
  await loadCatalog()
}

async function loadCatalog() {
  catalogLoading.value = true
  try {
    const q = catalogSearch.value.trim()
    const d = await api.get(`/tovar?limit=60${q ? '&search=' + encodeURIComponent(q) : ''}`)
    catalogResults.value = d.data ?? []
  } finally { catalogLoading.value = false }
}

watch(catalogSearch, () => {
  clearTimeout(catalogTimer)
  catalogTimer = setTimeout(loadCatalog, 300)
})

function toggleCatalogItem(id) {
  const s = new Set(catalogSelected.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  catalogSelected.value = s
}

function addCatalogSelected() {
  catalogResults.value
    .filter(t => catalogSelected.value.has(t.id))
    .forEach(t => addQator(tovarToQator(t)))
  catalogOpen.value = false
}

// ─── Summary ──────────────────────────────────────────────────────────────────
const jamiSumma  = computed(() => qatorlar.value.reduce((s, q) => s + (Number(q.summa)||0), 0))
const jamiDona   = computed(() => qatorlar.value.reduce((s, q) => s + jamiDonaQator(q), 0))
const jamiBlok   = computed(() => qatorlar.value.reduce((s, q) => s + (Number(q.bloklarda)||0), 0))
const jamiQuti   = computed(() => qatorlar.value.reduce((s, q) => s + (Number(q.qutilarda)||0), 0))

// ─── Save ─────────────────────────────────────────────────────────────────────
const saving  = ref(false)
const holat   = ref('qoralama')
const errMsg  = ref('')

async function save(andNew = false, tasdiqla = false) {
  saving.value = true
  errMsg.value = ''
  try {
    const body = {
      sana:              head.sana,
      yetkazuvchi:       head.yetkazuvchi       || null,
      yetkazuvchi_id:    head.yetkazuvchi_id    || null,
      tolov_turi:        head.tolov_turi         || null,
      tolangan_summa:    head.tolangan_summa     || 0,
      ombor:             head.ombor             || null,
      izoh:              head.izoh              || null,
      qoshimcha_xarajat: head.qoshimcha_xarajat || 0,
      qatorlar: qatorlar.value.map(q => ({
        tovar_id:              q.tovar_id,
        tovar_nomi:            q.tovar_nomi,
        tovar_kodi:            q.tovar_kodi  || null,
        shtrix_kod:            q.shtrix_kod  || null,
        turkum:                q.turkum      || null,
        ishlab_chiqarish_sana: q.ishlab_chiqarish_sana || null,
        yaroqlilik_muddati:    q.yaroqlilik_muddati    || null,
        // q.narx — inputda ko'ringan YAKUNIY (qo'shimcha xarajat qo'shilgan) tannarx,
        // shuni backend'ga yuboramiz: ombor/foyda hisobotlari shu haqiqiy tannarxga
        // asoslanishi kerak.
        narx:             Number(q.narx)             || 0,
        narx_usd:         Number(q.narx_usd)         || 0,
        // Bitta sotish narxi — optom/chakana ikkalasiga ham shu (mijoz narx turi qaysi bo'lsa ham bir xil)
        sotuv_narx:       Number(q.sotuv_narx)       || 0,
        optom_narx:       Number(q.sotuv_narx)       || 0,
        optom_narx_usd:   0,
        chakana_narx:     Number(q.sotuv_narx)       || 0,
        chakana_narx_usd: 0,
        qutilarda: Number(q.qutilarda) || 0,
        bloklarda: Number(q.bloklarda) || 0,
        // Backend/ombor qoldig'i uchun donada = JAMI dona (blok+quti+qo'lda kiritilgan qo'shimcha dona)
        donada:    jamiDonaQator(q),
        hajm:      Number(q.hajm)      || 0,
        summa:     Number(q.summa)     || 0,
      })),
    }

    let result
    if (isEdit.value) {
      result = await api.patch(`/prixod/${docId.value}`, body)
    } else {
      result = await api.post('/prixod', body)
    }

    if (tasdiqla) {
      await api.patch(`/prixod/${result.id}/tasdiq`, {})
    } else {
      notifStore.prixodKeldi({
        prixodId:   result.id,
        yetkazuvchi: head.yetkazuvchi || '',
        qatorSon:   qatorlar.value.length,
        summa:      jamiSumma.value,
        ombor:      head.ombor,
      })
    }

    if (andNew) {
      resetForm()
      router.replace('/ombor/prixod/yangi')
    } else {
      router.push('/ombor/prixod')
    }
  } catch (e) {
    errMsg.value = e.message || 'Xatolik yuz berdi'
    setTimeout(() => { errMsg.value = '' }, 5000)
  } finally {
    saving.value = false
  }
}

// Tasdiqlangan hujjat: tannarx, sotish narxi va (Admin uchun) miqdor tuzatiladi — backend
// /prixod/:id/narxlar qator + register narxlari va miqdorini, hujjat summasi va yetkazuvchi
// qarzi farqini yangilaydi; miqdor kamaytirilganda sotilgan tovarni tekshiradi
async function saveNarxlar() {
  saving.value = true
  errMsg.value = ''
  try {
    await api.patch(`/prixod/${docId.value}/narxlar`, {
      qatorlar: qatorlar.value.filter(q => q._qid).map(q => ({
        id: q._qid, narx: Number(q.narx) || 0, narx_usd: Number(q.narx_usd) || 0, sotuv_narx: Number(q.sotuv_narx) || 0,
        ...(admin.value ? { donada: jamiDonaQator(q) } : {}),
      })),
    })
    router.push('/ombor/prixod')
  } catch (e) {
    errMsg.value = e.message || 'Xatolik yuz berdi'
    setTimeout(() => { errMsg.value = '' }, 5000)
  } finally {
    saving.value = false
  }
}

function resetForm() {
  Object.assign(head, { sana: new Date().toISOString().slice(0,16), yetkazuvchi:'', yetkazuvchi_id:null, tolov_turi:null, tolangan_summa:0, ombor:'Основной склад', izoh:'', qoshimcha_xarajat:0 })
  qatorlar.value = []
}

// ─── Load existing ────────────────────────────────────────────────────────────
onMounted(async () => {
  // Yetkazuvchilar ro'yxatini har doim yuklaymiz
  try {
    const yd = await api.get('/yetkazuvchilar?limit=200')
    yetkazuvchilar.value = yd.data ?? []
  } catch { /* ignore */ }

  // Joriy dollar kursi ($ narx kiritilganda avtomatik so'm hisoblash uchun)
  try {
    const kd = await sozlamaApi.getKurs()
    kurs.value = kd.kurs || kurs.value
  } catch { /* ignore — default qiymat bilan davom etadi */ }

  if (!isEdit.value) return
  try {
    const d = await api.get(`/prixod/${docId.value}`)
    head.sana              = d.sana ? new Date(d.sana).toISOString().slice(0,16) : head.sana
    head.yetkazuvchi       = d.yetkazuvchi       || ''
    head.yetkazuvchi_id    = d.yetkazuvchi_id    || null
    head.tolov_turi        = d.tolov_turi        || null
    head.tolangan_summa    = d.tolangan_summa    || 0
    head.ombor             = d.ombor             || 'Основной склад'
    head.izoh              = d.izoh              || ''
    head.qoshimcha_xarajat = d.qoshimcha_xarajat || 0
    holat.value            = d.holat             || 'qoralama'
    qatorlar.value = (d.qatorlar || []).map(q => ({
      _id:                  ++qSeq,
      tovar_id:             q.tovar_id,
      tovar_nomi:           q.tovar_nomi,
      tovar_kodi:           q.tovar_kodi            || '',
      shtrix_kod:           q.shtrix_kod            || '',
      turkum:               q.turkum                || '',
      ishlab_chiqarish_sana:q.ishlab_chiqarish_sana || '',
      yaroqlilik_muddati:   q.yaroqlilik_muddati    || '',
      _qid:           q.id,                 // serverdagi qator id — tasdiqlangan hujjatda narx tuzatish uchun
      narx:           q.narx           || 0,
      narx_usd:       q.narx_usd       || 0,
      // Ustama backendda saqlanmaydi — tannarx va sotish narxidan taxminiy tiklanadi
      ustama: (Number(q.narx) > 0 && Number(q.chakana_narx || q.sotuv_narx) > 0)
        ? +(((Number(q.chakana_narx || q.sotuv_narx) / Number(q.narx)) - 1) * 100).toFixed(2)
        : 0,
      sotuv_narx:     Number(q.chakana_narx || q.sotuv_narx || q.optom_narx) || 0,
      qutilarda: q.qutilarda || 0,
      bloklarda: q.bloklarda || 0,
      // Backenddan kelgan donada — JAMI dona (blok+quti+qo'shimcha birga).
      // Haqiqiy blok o'lchami quyida (tovar ma'lumoti kelgach) tiklanadi,
      // shunda blok/quti ulushi ayirilib faqat "qo'lda kiritilgan qo'shimcha
      // dona" qoladi — aks holda blok/quti ikki marta hisoblanib qolardi.
      donada:    q.donada    || 0,
      hajm:      q.hajm      || 0,
      summa:     q.summa     || 0,
      _olchov:   'kg',
      _blokdagi: 1,
      _qutidagi: 1,
      _xom:      false,
    }))

    // Har bir qator uchun tovarning haqiqiy blok/quti o'lchamini tiklaymiz,
    // shunda "Bloklarda"/"Qutilarda" tahrirlanganda to'g'ri hisoblanadi va
    // "Donada" faqat qo'lda kiritilgan qo'shimcha dona sifatida qoladi.
    await Promise.all(qatorlar.value.map(async (q) => {
      if (!q.tovar_id) return
      try {
        const t = await api.get(`/tovar/${q.tovar_id}`)
        const blokdagi = Number(t.blokdagi_soni)    || 1
        const qutidagi = Number(t.qutidagi_bloklar) || 1
        const blokUlush = (Number(q.bloklarda) || 0) * blokdagi
          + (Number(q.qutilarda) || 0) * blokdagi * qutidagi
        q._blokdagi = blokdagi
        q._qutidagi = qutidagi
        q._xom = t.turi === 'xom_ashyo'
        q.donada = Math.max(0, (Number(q.donada) || 0) - blokUlush)
      } catch { /* tovar topilmasa — 1/1 va to'liq donada bilan qoladi */ }
    }))
  } catch (e) {
    errMsg.value = 'Hujjat yuklanmadi: ' + e.message
  }
})

const readonly = computed(() => holat.value === 'tasdiqlangan')

function fmtSum(n) {
  return Number(n || 0).toLocaleString('uz-UZ')
}

function avatarColor(name) {
  const colors = ['#4f46e5','#6366f1','#4338ca','#3730a3']
  let h = 0
  for (let i = 0; i < (name||'').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return colors[Math.abs(h) % colors.length]
}
</script>

<template>
  <div class="pf">

    <!-- ══ TOPBAR ══ -->
    <div class="pf-top">
      <button class="pf-back" @click="router.push('/ombor/prixod')">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
      </button>
      <div class="pf-top-info">
        <h2 class="pf-title">{{ title }}</h2>
        <span v-if="isEdit" class="pf-doc-num"># {{ docId }}</span>
      </div>
      <span v-if="isEdit" :class="['pf-badge', holat === 'tasdiqlangan' ? 'pf-badge--ok' : 'pf-badge--draft']">
        <span class="pf-badge-dot"/>
        {{ holat === 'tasdiqlangan' ? 'Tasdiqlangan' : 'Qoralama' }}
      </span>
      <div class="pf-kurs-wrap" v-if="!kursEditing">
        <button
          class="pf-kurs-chip"
          type="button"
          title="Prixodda $ narx kiritilganda ishlatiladigan joriy kurs — o'zgartirish uchun bosing"
          :disabled="readonly"
          @click="!readonly && openKursEdit()"
        >
          1$ = {{ fmtSum(kurs) }} so'm
          <svg v-if="!readonly" class="pf-kurs-edit-ic" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-8.5 8.5a2 2 0 01-.844.503l-3.03.86a.5.5 0 01-.618-.618l.86-3.03a2 2 0 01.503-.844l8.5-8.5z"/></svg>
        </button>
      </div>
      <div class="pf-kurs-edit" v-else>
        <span class="pf-kurs-edit-lbl">1$ =</span>
        <NumberInput
          v-model="kursDraft" :bosh="''"
          css-class="pf-kurs-edit-in" autofocus
          @keyup.enter="saveKurs" @keyup.esc="closeKursEdit"
        />
        <span class="pf-kurs-edit-lbl">so'm</span>
        <button class="pf-kurs-edit-btn pf-kurs-edit-btn--ok" :disabled="kursSaving" @click="saveKurs" title="Saqlash">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
        </button>
        <button class="pf-kurs-edit-btn pf-kurs-edit-btn--x" :disabled="kursSaving" @click="closeKursEdit" title="Bekor qilish">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
        </button>
      </div>
      <div class="pf-top-spacer"/>
      <template v-if="readonly">
        <span class="pf-lock-hint">{{ admin ? "Tasdiqlangan — narx va miqdor (kg) tuzatiladi, ombor qoldig'i va yetkazuvchi qarzi shunga mos o'zgaradi" : "Tasdiqlangan — faqat tannarx va sotish narxi o'zgaradi (miqdorni Admin tuzatadi)" }}</span>
        <button class="pf-btn pf-btn--ghost" @click="router.push('/ombor/prixod')" :disabled="saving">Yopish</button>
        <button class="pf-btn pf-btn--primary" @click="saveNarxlar" :disabled="saving">
          <span v-if="saving" class="pf-spin"/>
          Tuzatishni saqlash
        </button>
      </template>
      <template v-if="!readonly">
        <button class="pf-btn pf-btn--ghost" @click="router.push('/ombor/prixod')" :disabled="saving">Bekor qilish</button>
        <button class="pf-btn pf-btn--outline" @click="save(true)" :disabled="saving">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          Saqlash va yangi
        </button>
        <button class="pf-btn pf-btn--primary" @click="save(false)" :disabled="saving">
          <svg v-if="!saving" viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293z"/></svg>
          <span v-if="saving" class="pf-spin"/>
          {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
        </button>
        <button class="pf-btn pf-btn--green" @click="save(false, true)" :disabled="saving">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
          Tasdiqlash
        </button>
      </template>
      <template v-else>
        <button class="pf-btn pf-btn--ghost" @click="router.push('/ombor/prixod')">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd"/></svg>
          Orqaga
        </button>
      </template>
    </div>

    <!-- error bar -->
    <div v-if="errMsg" class="pf-errbar">
      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
      {{ errMsg }}
    </div>

    <div class="pf-body">

      <!-- ══ LEFT ══ -->
      <div class="pf-main">

        <!-- Head card -->
        <div class="pf-card pf-card--head">
          <div class="pf-card-head">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
            Hujjat ma'lumotlari
          </div>
          <div class="pf-head-grid">
            <div class="pf-field">
              <label class="pf-lbl">Kelish sanasi</label>
              <input type="datetime-local" v-model="head.sana" class="pf-in" :disabled="readonly"/>
            </div>
            <!-- Yetkazuvchi custom dropdown -->
            <div class="pf-field">
              <label class="pf-lbl">Yetkazuvchi</label>
              <div class="pf-csel-wrap" v-if="!readonly">
                <button type="button" class="pf-csel" :class="{ 'pf-csel--open': yetkazuvchiOpen }" @click="yetkazuvchiOpen = !yetkazuvchiOpen">
                  <span v-if="selectedYetkazuvchi" class="pf-csel-val pf-ytk-val">
                    <span class="pf-ytk-dot" :class="Number(selectedYetkazuvchi.balans) < 0 ? 'pf-ytk-dot--red' : 'pf-ytk-dot--green'"/>
                    {{ selectedYetkazuvchi.ism }}
                  </span>
                  <span v-else class="pf-csel-val pf-csel-placeholder">Yetkazuvchi tanlang...</span>
                  <button v-if="selectedYetkazuvchi" type="button" class="pf-ytk-clear" @click.stop="clearYetkazuvchi">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                  </button>
                  <svg v-else class="pf-csel-arr" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                </button>
                <Transition name="drop">
                  <div v-if="yetkazuvchiOpen" class="pf-csel-drop pf-ytk-drop">
                    <div class="pf-ytk-srch">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
                      <input v-model="yetkazuvchiSearch" class="pf-ytk-srch-in" placeholder="Qidirish..." @click.stop/>
                    </div>
                    <div class="pf-ytk-list">
                      <div v-if="filteredYetkazuvchilar.length === 0" class="pf-ytk-empty">Topilmadi</div>
                      <div
                        v-for="y in filteredYetkazuvchilar" :key="y.id"
                        class="pf-csel-opt pf-ytk-opt"
                        :class="{ 'pf-csel-opt--on': head.yetkazuvchi_id === y.id }"
                        @mousedown.prevent="pickYetkazuvchi(y)"
                      >
                        <span class="pf-ytk-dot" :class="Number(y.balans) < 0 ? 'pf-ytk-dot--red' : 'pf-ytk-dot--green'"/>
                        <div class="pf-ytk-info">
                          <span class="pf-ytk-ism">{{ y.ism }}</span>
                          <span class="pf-ytk-balans" :class="Number(y.balans) < 0 ? 'pf-ytk-balans--red' : 'pf-ytk-balans--green'">
                            {{ Number(y.balans) < 0 ? 'Qarzdor: ' + Math.abs(Number(y.balans)).toLocaleString('uz-UZ') : Number(y.balans) > 0 ? 'Ortiqcha: ' + Number(y.balans).toLocaleString('uz-UZ') : 'Hisob-kitob toza' }}
                          </span>
                        </div>
                        <svg v-if="head.yetkazuvchi_id === y.id" class="pf-csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
              <!-- readonly holatda oddiy matn -->
              <div v-else class="pf-in pf-in--readonly">{{ head.yetkazuvchi || '—' }}</div>
            </div>

            <!-- To'lov turi (faqat yetkazuvchi tanlanganda) -->
            <div class="pf-field" v-if="head.yetkazuvchi_id && !readonly">
              <label class="pf-lbl">To'lov turi</label>
              <div class="pf-radio-group">
                <label v-for="t in [{ v:'naqt', l:'Naqt' }, { v:'optom', l:'Optom' }, { v:'chaka', l:'Chaka' }]" :key="t.v" class="pf-radio" :class="{ 'pf-radio--on': head.tolov_turi === t.v }" @click="head.tolov_turi = t.v">
                  <div class="pf-radio-dot" :class="{ 'pf-radio-dot--on': head.tolov_turi === t.v }"/>
                  {{ t.l }}
                </label>
              </div>
            </div>
            <div class="pf-field" v-else-if="readonly && head.tolov_turi">
              <label class="pf-lbl">To'lov turi</label>
              <div class="pf-in pf-in--readonly">{{ head.tolov_turi }}</div>
            </div>

            <!-- Dastlabki to'lov summasi -->
            <div class="pf-field" v-if="head.yetkazuvchi_id">
              <label class="pf-lbl">Dastlabki to'lov</label>
              <div class="pf-in-suffix">
                <NumberInput v-model="head.tolangan_summa" css-class="pf-in" :disabled="readonly" placeholder="0"/>
                <span class="pf-suffix">UZS</span>
              </div>
              <span v-if="!readonly && head.tolangan_summa > 0 && head.tolangan_summa < jamiSumma" class="pf-ytk-hint">
                Qoldiq qarz: {{ (jamiSumma - head.tolangan_summa).toLocaleString('uz-UZ') }} UZS
              </span>
              <span v-else-if="!readonly && head.tolangan_summa >= jamiSumma && jamiSumma > 0" class="pf-ytk-hint pf-ytk-hint--ok">
                To'liq to'landi
              </span>
            </div>
            <div class="pf-field">
              <label class="pf-lbl">Ombor</label>
              <div class="pf-csel-wrap">
                <button type="button" class="pf-csel" :class="{ 'pf-csel--open': openSel==='ombor', 'pf-csel--disabled': readonly }" @click="!readonly && toggleSel('ombor')">
                  <span class="pf-csel-val">{{ selLabel('ombor', head.ombor) }}</span>
                  <svg class="pf-csel-arr" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                </button>
                <Transition name="drop">
                  <div v-if="openSel==='ombor'" class="pf-csel-drop">
                    <div v-for="o in SEL_OPTIONS.ombor" :key="o.value" class="pf-csel-opt" :class="{ 'pf-csel-opt--on': head.ombor===o.value }" @mousedown.prevent="pickSel('ombor','ombor',o.value)">
                      <span v-if="o.icon" class="pf-csel-ico">{{ o.icon }}</span>
                      <span>{{ o.label }}</span>
                      <svg v-if="head.ombor===o.value" class="pf-csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                    </div>
                  </div>
                </Transition>
              </div>
              <span v-if="xomSoni" class="pf-ombor-hint">{{ xomSoni }} ta xom ashyo qatori Xom ashyo omboriga tushadi</span>
            </div>
            <div class="pf-field pf-field--xarajat">
              <label class="pf-lbl">Qo'shimcha xarajat</label>
              <div class="pf-in-suffix">
                <NumberInput v-model="head.qoshimcha_xarajat" css-class="pf-in" :disabled="readonly"/>
                <span class="pf-suffix">UZS</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Products card -->
        <div class="pf-card pf-card--products">

          <!-- Toolbar -->
          <div class="pf-tbar">
            <div class="pf-tbar-l">
              <button v-if="!readonly" class="pf-btn pf-btn--catalog" @click="openCatalog">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>
                Ro'yxatdan qo'shish
              </button>
              <div v-if="qatorlar.length" class="pf-count-chip">
                <span>{{ qatorlar.length }} ta mahsulot</span>
              </div>
            </div>
            <div class="pf-tbar-r">
              <!-- col visibility -->
              <div class="pf-col-wrap">
                <button class="pf-btn pf-btn--cols" @click="colVisOpen = !colVisOpen">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"/></svg>
                  Ustunlar
                </button>
                <Transition name="drop">
                  <div v-if="colVisOpen" class="pf-col-drop">
                    <div class="pf-col-drop-head">Ustunlarni tanlash</div>
                    <div v-for="(val, key) in colVis" :key="key" class="pf-col-item" @click="colVis[key] = !val">
                      <div class="pf-tog" :class="val && 'pf-tog--on'">
                        <div class="pf-tog-knob"/>
                      </div>
                      <span>{{ COL_LABELS[key] }}</span>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </div>

          <!-- Table -->
          <div class="pf-tbl-wrap">
            <table class="pf-tbl">
              <thead>
                <tr>
                  <th class="pf-th pf-th--num">#</th>
                  <th v-if="colVis.foto"       class="pf-th pf-th--foto"></th>
                  <th v-if="colVis.turkum"     class="pf-th">Turkum</th>
                  <th class="pf-th pf-th--tovar">Tovar nomi</th>
                  <th v-if="colVis.tovar_kodi" class="pf-th">Tovar kodi</th>
                  <th v-if="colVis.shtrix_kod" class="pf-th">Shtrix-kod</th>
                  <th v-if="colVis.ishlab_sana" class="pf-th pf-th--date">Ishlab chiqarish</th>
                  <th v-if="colVis.yaroqlilik" class="pf-th pf-th--date">Yaroqlilik</th>
                  <th class="pf-th pf-th--r">Tannarx</th>
                  <th v-if="colVis.ustama" class="pf-th pf-th--r pf-th--foiz">Ustama %</th>
                  <th v-if="colVis.sotuv_narx" class="pf-th pf-th--r pf-th--sotuv">Sotish narxi</th>
                  <th v-if="colVis.qutilarda"  class="pf-th pf-th--r">Qutilarda</th>
                  <th v-if="colVis.bloklarda"  class="pf-th pf-th--r">Bloklarda</th>
                  <th v-if="colVis.donada"     class="pf-th pf-th--r">Miqdor</th>
                  <th v-if="colVis.hajm"       class="pf-th pf-th--r">Hajm</th>
                  <th v-if="colVis.summa"      class="pf-th pf-th--r pf-th--summa">Summa</th>
                  <th class="pf-th pf-th--act"></th>
                </tr>
              </thead>
              <tbody>

                <!-- Data rows -->
                <tr v-for="(q, i) in qatorlar" :key="q._id" class="pf-tr">
                  <td class="pf-td pf-td--num">{{ i + 1 }}</td>
                  <td v-if="colVis.foto" class="pf-td pf-td--foto">
                    <div class="pf-av" :style="{ background: avatarColor(q.tovar_nomi) + '22', color: avatarColor(q.tovar_nomi) }">
                      {{ (q.tovar_nomi || '?').charAt(0).toUpperCase() }}
                    </div>
                  </td>
                  <td v-if="colVis.turkum" class="pf-td">
                    <span v-if="q.turkum" class="pf-chip">{{ q.turkum }}</span>
                    <span v-else class="pf-muted">—</span>
                  </td>
                  <td class="pf-td pf-td--name">{{ q.tovar_nomi }}<span v-if="q._xom" class="pf-xom" title="Xom ashyo savdo skladiga emas, alohida omborga tushadi">Xom ashyo ombori</span></td>
                  <td v-if="colVis.tovar_kodi" class="pf-td pf-td--mono">{{ q.tovar_kodi || '—' }}</td>
                  <td v-if="colVis.shtrix_kod" class="pf-td pf-td--mono">{{ q.shtrix_kod || '—' }}</td>
                  <td v-if="colVis.ishlab_sana" class="pf-td">
                    <input v-if="!readonly" type="date" v-model="q.ishlab_chiqarish_sana" class="pf-cell-in pf-cell-in--date"/>
                    <span v-else class="pf-muted">{{ q.ishlab_chiqarish_sana || '—' }}</span>
                  </td>
                  <td v-if="colVis.yaroqlilik" class="pf-td">
                    <input v-if="!readonly" type="date" v-model="q.yaroqlilik_muddati" class="pf-cell-in pf-cell-in--date"/>
                    <span v-else class="pf-muted">{{ q.yaroqlilik_muddati || '—' }}</span>
                  </td>
                  <!-- Narxlar tasdiqlangan hujjatda ham tahrirlanadi (miqdorlar emas) -->
                  <td class="pf-td pf-td--r pf-td--narxcol">
                    <div class="pf-narx-dual">
                      <div class="pf-narx-row">
                        <span class="pf-narx-tag pf-narx-tag--som">so'm</span>
                        <NumberInput v-model="q.narx" css-class="pf-cell-in pf-cell-in--r pf-cell-in--narx" @input="onNarxInput(q)" placeholder="0"/>
                      </div>
                      <div class="pf-narx-row">
                        <span class="pf-narx-tag pf-narx-tag--usd">$</span>
                        <NumberInput v-model="q.narx_usd" css-class="pf-cell-in pf-cell-in--r pf-cell-in--usd" @input="onNarxUsdInput(q)" placeholder="0.00"/>
                      </div>
                      <div v-if="donaXarajati() > 0" class="pf-xarajat-hint">
                        +{{ fmtSum(donaXarajati()) }}/{{ q._olchov }} (xarajat)
                      </div>
                    </div>
                  </td>
                  <td v-if="colVis.ustama" class="pf-td pf-td--r">
                    <div class="pf-narx-row">
                      <NumberInput v-model="q.ustama" css-class="pf-cell-in pf-cell-in--r pf-cell-in--qty" @input="onUstamaInput(q)" placeholder="0"/>
                      <span class="pf-narx-tag pf-narx-tag--foiz">%</span>
                    </div>
                  </td>
                  <td v-if="colVis.sotuv_narx" class="pf-td pf-td--r pf-td--narxcol">
                    <div class="pf-narx-row">
                      <span class="pf-narx-tag pf-narx-tag--som">so'm</span>
                      <NumberInput v-model="q.sotuv_narx" css-class="pf-cell-in pf-cell-in--r pf-cell-in--narx pf-cell-in--sotuv" @input="onSotuvNarxInput(q)" placeholder="0"/>
                    </div>
                    <span v-if="Number(q.narx) > 0 && Number(q.sotuv_narx) > 0" class="pf-dona-jami" :class="Number(q.sotuv_narx) < Number(q.narx) && 'pf-dona-jami--zarar'">
                      {{ Number(q.sotuv_narx) >= Number(q.narx) ? 'foyda' : 'ZARAR' }} {{ fmtSum(Math.abs(Number(q.sotuv_narx) - Number(q.narx))) }}/{{ q._olchov }}
                    </span>
                  </td>
                  <td v-if="colVis.qutilarda" class="pf-td pf-td--r">
                    <NumberInput v-if="!readonly" v-model="q.qutilarda" css-class="pf-cell-in pf-cell-in--r pf-cell-in--qty" @input="recalc(q)" placeholder="0"/>
                    <span v-else class="pf-num">{{ q.qutilarda }}</span>
                  </td>
                  <td v-if="colVis.bloklarda" class="pf-td pf-td--r">
                    <NumberInput v-if="!readonly" v-model="q.bloklarda" css-class="pf-cell-in pf-cell-in--r pf-cell-in--qty" @input="recalc(q)" placeholder="0"/>
                    <span v-else class="pf-num">{{ q.bloklarda }}</span>
                  </td>
                  <td v-if="colVis.donada" class="pf-td pf-td--r">
                    <!-- Tasdiqlangan hujjatda miqdorni Admin tuzatadi (backend qoldiqni tekshiradi) -->
                    <NumberInput v-if="!readonly || admin" v-model="q.donada" css-class="pf-cell-in pf-cell-in--r pf-cell-in--qty" @input="onDonadaInput(q)" placeholder="0"/>
                    <span v-else class="pf-num" title="Tasdiqlangan hujjatda miqdorni faqat Admin tuzatadi">{{ q.donada }} {{ q._olchov }}</span>
                    <span v-if="Number(q.bloklarda) > 0 || Number(q.qutilarda) > 0" class="pf-dona-jami">
                      Jami: {{ jamiDonaQator(q) }} {{ q._olchov }}
                    </span>
                  </td>
                  <td v-if="colVis.hajm" class="pf-td pf-td--r">
                    <NumberInput v-if="!readonly" v-model="q.hajm" css-class="pf-cell-in pf-cell-in--r pf-cell-in--qty"/>
                    <span v-else class="pf-num">{{ q.hajm }}</span>
                  </td>
                  <td v-if="colVis.summa" class="pf-td pf-td--r">
                    <span class="pf-summa">{{ fmtSum(q.summa) }}</span>
                  </td>
                  <td class="pf-td pf-td--act">
                    <button v-if="!readonly" class="pf-del-btn" @click="removeQator(q._id)" title="O'chirish">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                  </td>
                </tr>

                <!-- Inline search row -->
                <tr v-if="!readonly" class="pf-tr pf-tr--add">
                  <td class="pf-td" colspan="99">
                    <div class="pf-inline-wrap">
                      <div class="pf-inline-srch">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
                        <input
                          ref="inlineInputRef"
                          v-model="inlineSearch"
                          class="pf-inline-in"
                          placeholder="Mahsulot nomini kiriting..."
                          @blur="onInlineBlur"
                          @keydown.esc="inlineSearch = ''; showInlineDrop = false"
                        />
                        <span v-if="inlineSearching" class="pf-spin pf-spin--sm"/>
                        <kbd class="pf-kbd">Enter</kbd>
                      </div>
                      <!-- Inline dropdown -->
                      <Transition name="drop">
                        <div v-if="showInlineDrop" class="pf-inline-drop">
                          <div
                            v-for="t in inlineResults" :key="t.id"
                            class="pf-inline-opt"
                            @mousedown.prevent="pickInline(t)"
                          >
                            <div class="pf-av pf-av--sm" :style="{ background: avatarColor(t.nomi) + '22', color: avatarColor(t.nomi) }">
                              {{ t.nomi.charAt(0).toUpperCase() }}
                            </div>
                            <div class="pf-inline-info">
                              <span class="pf-inline-name">{{ t.nomi }}</span>
                              <span class="pf-inline-sub">
                                <span v-if="t.turkum" class="pf-chip pf-chip--xs">{{ t.turkum }}</span>
                                <span>{{ t.olchov_birligi || 'kg' }}</span>
                                <span v-if="t.shtrix_kod" class="pf-mono">{{ t.shtrix_kod }}</span>
                              </span>
                            </div>
                            <div class="pf-inline-meta">
                              <span v-if="t.blokdagi_soni && t.blokdagi_soni > 1" class="pf-meta-tag">{{ t.blokdagi_soni }} kg/blok</span>
                              <span v-if="t.hajm && Number(t.hajm) > 0" class="pf-meta-tag">{{ t.hajm }} m³</span>
                            </div>
                          </div>
                          <!-- Katalogda topilmagan tovarni shu yerdan yaratish -->
                          <div class="pf-inline-opt pf-inline-opt--new" @mousedown.prevent="openNewTovarModal">
                            <div class="pf-av pf-av--sm pf-av--new">
                              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                            </div>
                            <div class="pf-inline-info">
                              <span class="pf-inline-name pf-inline-name--new">"{{ inlineSearch }}" — yangi tovar sifatida qo'shish</span>
                              <span class="pf-inline-sub">Katalogda topilmasa, shu yerda yaratasiz</span>
                            </div>
                          </div>
                        </div>
                      </Transition>
                    </div>
                  </td>
                </tr>

                <!-- Empty state -->
                <tr v-if="qatorlar.length === 0 && readonly">
                  <td colspan="99" class="pf-td-empty">Qatorlar yo'q</td>
                </tr>

                <!-- Jami row -->
                <tr v-if="qatorlar.length" class="pf-tr pf-tr--jami">
                  <td class="pf-td pf-td--jami-lbl" :colspan="
                    2
                    + (colVis.foto ? 1 : 0)
                    + (colVis.turkum ? 1 : 0)
                    + (colVis.tovar_kodi ? 1 : 0)
                    + (colVis.shtrix_kod ? 1 : 0)
                    + (colVis.ishlab_sana ? 1 : 0)
                    + (colVis.yaroqlilik ? 1 : 0)
                  ">Jami</td>
                  <td class="pf-td pf-td--r pf-td--jami">—</td>
                  <td v-if="colVis.optom_foiz" class="pf-td pf-td--r pf-td--jami">—</td>
                  <td v-if="colVis.optom_narx" class="pf-td pf-td--r pf-td--jami">—</td>
                  <td v-if="colVis.chakana_foiz" class="pf-td pf-td--r pf-td--jami">—</td>
                  <td v-if="colVis.chakana_narx" class="pf-td pf-td--r pf-td--jami">—</td>
                  <td v-if="colVis.qutilarda" class="pf-td pf-td--r pf-td--jami">{{ jamiQuti }}</td>
                  <td v-if="colVis.bloklarda" class="pf-td pf-td--r pf-td--jami">{{ jamiBlok }}</td>
                  <td v-if="colVis.donada"    class="pf-td pf-td--r pf-td--jami">{{ jamiDona }}</td>
                  <td v-if="colVis.hajm"      class="pf-td pf-td--r pf-td--jami">{{ qatorlar.reduce((s,q)=>s+(Number(q.hajm)||0),0) }}</td>
                  <td v-if="colVis.summa"     class="pf-td pf-td--r pf-td--jami pf-td--jami-sum">{{ fmtSum(jamiSumma) }}</td>
                  <td class="pf-td"/>
                </tr>

              </tbody>
            </table>
          </div>

        </div>

        <!-- Izoh row -->
        <div class="pf-card pf-card--note">
          <div class="pf-field">
            <label class="pf-lbl">Izoh</label>
            <textarea v-model="head.izoh" class="pf-ta" rows="2" placeholder="Kelish haqida qo'shimcha ma'lumot..." :disabled="readonly"/>
          </div>
        </div>

      </div>
    </div>

    <!-- ══ CATALOG MODAL ══ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="catalogOpen" class="cat-overlay" @click.self="catalogOpen = false">
          <div class="cat-modal">
            <div class="cat-head">
              <div class="cat-head-info">
                <div class="cat-head-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/></svg>
                </div>
                <div>
                  <h3 class="cat-title">Mahsulotlar katalogi</h3>
                  <p class="cat-sub">Prixodga qo'shish uchun mahsulotlarni tanlang</p>
                </div>
              </div>
              <button class="cat-close" @click="catalogOpen = false">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              </button>
            </div>

            <div class="cat-srch-bar">
              <div class="cat-srch">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
                <input v-model="catalogSearch" class="cat-srch-in" placeholder="Mahsulot nomini qidirish..."/>
                <span v-if="catalogLoading" class="pf-spin pf-spin--sm"/>
              </div>
              <div v-if="catalogSelected.size > 0" class="cat-sel-chip">
                {{ catalogSelected.size }} ta tanlandi
              </div>
            </div>

            <div class="cat-list">
              <div v-if="catalogLoading && catalogResults.length === 0" class="cat-loading">
                <span class="pf-spin"/>
                Yuklanmoqda...
              </div>
              <div v-else-if="catalogResults.length === 0" class="cat-empty">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clip-rule="evenodd"/></svg>
                Mahsulotlar topilmadi
                <button v-if="catalogSearch.trim()" class="pf-btn pf-btn--primary cat-new-btn" @click="openNewTovarModalFromCatalog">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                  "{{ catalogSearch.trim() }}" — yangi tovar sifatida qo'shish
                </button>
              </div>
              <div
                v-for="t in catalogResults" :key="t.id"
                class="cat-item"
                :class="{ 'cat-item--sel': catalogSelected.has(t.id) }"
                @click="toggleCatalogItem(t.id)"
              >
                <div class="cat-item-check" :class="{ 'cat-item-check--on': catalogSelected.has(t.id) }">
                  <svg v-if="catalogSelected.has(t.id)" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                </div>
                <div class="pf-av" :style="{ background: avatarColor(t.nomi) + '22', color: avatarColor(t.nomi) }">
                  {{ t.nomi.charAt(0).toUpperCase() }}
                </div>
                <div class="cat-item-info">
                  <span class="cat-item-name">{{ t.nomi }}</span>
                  <div class="cat-item-sub">
                    <span v-if="t.turkum" class="pf-chip pf-chip--xs">{{ t.turkum }}</span>
                    <span class="pf-mono" v-if="t.shtrix_kod">{{ t.shtrix_kod }}</span>
                    <span class="cat-item-olchov">{{ t.olchov_birligi || 'kg' }}</span>
                  </div>
                </div>
                <div class="cat-item-props">
                  <span v-if="t.blokdagi_soni && t.blokdagi_soni > 1" class="pf-meta-tag">
                    {{ t.blokdagi_soni }} d/blok
                  </span>
                  <span v-if="t.qutidagi_bloklar && t.qutidagi_bloklar > 1" class="pf-meta-tag">
                    {{ t.qutidagi_bloklar }} b/quti
                  </span>
                  <span v-if="t.hajm && Number(t.hajm) > 0" class="pf-meta-tag pf-meta-tag--dim">
                    {{ t.hajm }} m³
                  </span>
                </div>
              </div>
            </div>

            <div class="cat-foot">
              <button class="pf-btn pf-btn--ghost" @click="catalogOpen = false">Bekor qilish</button>
              <button
                class="pf-btn pf-btn--primary"
                :disabled="catalogSelected.size === 0"
                @click="addCatalogSelected"
              >
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                {{ catalogSelected.size > 0 ? `${catalogSelected.size} ta mahsulot qo'shish` : 'Tanlang' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ YANGI TOVAR MODAL (katalogda topilmagan tovarni tez qo'shish) ══ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="newTovarOpen.show" class="cat-overlay" @click.self="newTovarOpen.show = false">
          <div class="nt-modal">
            <div class="cat-head">
              <div class="cat-head-info">
                <div class="cat-head-icon">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                </div>
                <div>
                  <h3 class="cat-title">Yangi tovar</h3>
                  <p class="cat-sub">Katalogda topilmagan tovarni yaratib, prixodga qo'shasiz</p>
                </div>
              </div>
              <button class="cat-close" @click="newTovarOpen.show = false">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
              </button>
            </div>

            <div class="nt-body">
              <div v-if="newTovarOpen.error" class="pf-errbar" style="margin:0 0 12px">{{ newTovarOpen.error }}</div>
              <div class="pf-field">
                <label class="pf-lbl">Tovar nomi *</label>
                <input v-model="newTovarForm.nomi" class="pf-in" placeholder="Masalan: Coca-Cola 1.5L" @keydown.enter="saveNewTovar"/>
              </div>
              <div class="nt-row">
                <div class="pf-field">
                  <label class="pf-lbl">Turkum</label>
                  <input v-model="newTovarForm.turkum" list="pf-turkum-list" class="pf-in" placeholder="Masalan: Tovuq go'shti"/>
                <datalist id="pf-turkum-list"><option v-for="t in turkumRoyxati" :key="t" :value="t"/></datalist>
                </div>
                <div class="pf-field">
                  <label class="pf-lbl">O'lchov birligi</label>
                  <input v-model="newTovarForm.olchov_birligi" class="pf-in" placeholder="kg"/>
                </div>
                <div class="pf-field">
                  <label class="pf-lbl">Blokdagi soni</label>
                  <NumberInput v-model="newTovarForm.blokdagi_soni" css-class="pf-in" placeholder="1"/>
                </div>
              </div>
              <div class="pf-field">
                <label class="pf-lbl">Turi</label>
                <div class="nt-tur" role="radiogroup" aria-label="Tovar turi">
                  <button type="button" role="radio" :aria-checked="newTovarForm.turi === 'tovar'" :class="{ on: newTovarForm.turi === 'tovar' }" @click="newTovarForm.turi = 'tovar'">Savdo tovari<small>asosiy skladga</small></button>
                  <button type="button" role="radio" :aria-checked="newTovarForm.turi === 'xom_ashyo'" :class="{ on: newTovarForm.turi === 'xom_ashyo' }" @click="newTovarForm.turi = 'xom_ashyo'">Xom ashyo<small>Xom ashyo omboriga, sotilmaydi</small></button>
                </div>
              </div>
            </div>

            <div class="cat-foot">
              <button class="pf-btn pf-btn--ghost" @click="newTovarOpen.show = false" :disabled="newTovarOpen.saving">Bekor qilish</button>
              <button class="pf-btn pf-btn--primary" @click="saveNewTovar" :disabled="newTovarOpen.saving">
                <span v-if="newTovarOpen.saving" class="pf-spin"/>
                {{ newTovarOpen.saving ? 'Saqlanmoqda...' : "Yaratish va qo'shish" }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- overlays -->
    <div v-if="colVisOpen" class="pf-overlay" @click="colVisOpen = false"/>
    <div v-if="openSel" class="pf-overlay" @click="openSel = null"/>
    <div v-if="yetkazuvchiOpen" class="pf-overlay" @click="yetkazuvchiOpen = false"/>

  </div>
</template>

<style scoped>
/* ── Root ── */
.pf { display:flex; flex-direction:column; gap:0; min-height:100%; background:var(--page-bg,#f8fafc); }

/* ── Topbar ── */
.pf-top { display:flex; align-items:center; gap:10px; padding:0 0 18px; flex-wrap:wrap; }
.pf-back { width:36px; height:36px; border-radius:10px; border:1.5px solid var(--card-border); background:var(--card-bg); color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:.12s; }
.pf-back:hover { border-color:#6366f1; color:#6366f1; }
.pf-back svg { width:16px; height:16px; }
.pf-top-info { display:flex; align-items:baseline; gap:8px; }
.pf-title { font-size:20px; font-weight:800; color:var(--title); margin:0; letter-spacing:-.3px; }
.pf-doc-num { font-size:13px; color:var(--muted); font-weight:500; }
.pf-top-spacer { flex:1; }
.pf-kurs-chip { display:inline-flex; align-items:center; gap:6px; padding:5px 11px; border-radius:99px; background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.2); color:#d97706; font-size:11.5px; font-weight:700; white-space:nowrap; font-variant-numeric:tabular-nums; cursor:pointer; transition:.12s; }
.pf-kurs-chip:hover:not(:disabled) { background:rgba(245,158,11,.15); }
.pf-kurs-chip:disabled { cursor:default; }
.pf-kurs-edit-ic { width:11px; height:11px; opacity:.7; flex-shrink:0; }
.pf-kurs-edit { display:inline-flex; align-items:center; gap:6px; padding:4px 6px 4px 11px; border-radius:99px; background:rgba(245,158,11,.08); border:1px solid rgba(245,158,11,.35); }
.pf-kurs-edit-lbl { font-size:11.5px; font-weight:700; color:#d97706; white-space:nowrap; }
.pf-kurs-edit-in { width:80px; height:24px; border:1px solid rgba(245,158,11,.4); border-radius:6px; background:var(--card-bg,#fff); color:var(--body,#374151); font-size:12px; font-weight:700; text-align:right; padding:0 6px; outline:none; font-variant-numeric:tabular-nums; }
.pf-kurs-edit-in:focus { border-color:#d97706; box-shadow:0 0 0 2px rgba(245,158,11,.15); }
.pf-kurs-edit-btn { display:flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:6px; border:none; cursor:pointer; flex-shrink:0; }
.pf-kurs-edit-btn svg { width:12px; height:12px; }
.pf-kurs-edit-btn--ok { background:#10b981; color:#fff; }
.pf-kurs-edit-btn--ok:disabled { opacity:.5; cursor:not-allowed; }
.pf-kurs-edit-btn--x { background:transparent; color:#9ca3af; }
.pf-kurs-edit-btn--x:hover { color:#ef4444; }

.pf-badge { display:inline-flex; align-items:center; gap:5px; padding:4px 10px; border-radius:99px; font-size:11px; font-weight:700; letter-spacing:.02em; }
.pf-badge-dot { width:6px; height:6px; border-radius:50%; }
.pf-badge--ok    { background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.2); }
.pf-badge--ok .pf-badge-dot { background:#10b981; }
.pf-badge--draft { background:rgba(245,158,11,.1); color:#f59e0b; border:1px solid rgba(245,158,11,.2); }
.pf-badge--draft .pf-badge-dot { background:#f59e0b; }

/* ── Error bar ── */
.pf-errbar { display:flex; align-items:center; gap:8px; padding:10px 14px; background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); border-radius:10px; color:#ef4444; font-size:13px; margin-bottom:12px; }
.pf-errbar svg { width:16px; height:16px; flex-shrink:0; }

/* ── Layout ── */
.pf-body { display:flex; gap:16px; align-items:flex-start; flex:1; }
.pf-main { flex:1; min-width:0; display:flex; flex-direction:column; gap:14px; }

/* ── Card ── */
.pf-card { background:var(--card-bg); border:1.5px solid var(--card-border); border-radius:16px; overflow:hidden; }
.pf-card--products { overflow:visible; }
/* Select dropdown'lari (Yetkazuvchi/Ombor/Narx turi) shu kartada joylashgan —
   overflow:hidden bo'lsa dropdown karta chegarasidan tashqarida kesilib qolardi. */
.pf-card--head { overflow:visible; }
.pf-card--note { padding:16px; }
.pf-card-head { display:flex; align-items:center; gap:7px; padding:12px 16px 0; font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; }
.pf-card-head svg { width:14px; height:14px; }

/* Head grid */
.pf-head-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; padding:14px 16px 16px; }
.pf-field { display:flex; flex-direction:column; gap:5px; }
.pf-field--xarajat {}
.pf-lbl { font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; }
.pf-in  { height:38px; padding:0 11px; border-radius:9px; border:1.5px solid var(--card-border); background:var(--input-bg,var(--card-bg)); color:var(--body); font-size:13px; outline:none; transition:.12s; width:100%; }
.pf-in:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.pf-in:disabled { opacity:.5; cursor:not-allowed; }
/* ── Custom select ── */
.pf-csel-wrap { position:relative; }
.pf-csel { width:100%; height:38px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 11px; border-radius:9px; border:1.5px solid var(--card-border); background:var(--input-bg,var(--card-bg)); color:var(--body); font-size:13px; cursor:pointer; transition:.15s; text-align:left; }
.pf-csel:hover:not(.pf-csel--disabled) { border-color:#a5b4fc; }
.pf-csel--open { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.pf-csel--disabled { opacity:.5; cursor:not-allowed; }
.pf-csel-val { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pf-csel-placeholder { color:var(--muted); }
.pf-csel-arr { width:14px; height:14px; flex-shrink:0; color:var(--muted); transition:transform .15s; }
.pf-csel--open .pf-csel-arr { transform:rotate(180deg); color:#6366f1; }
.pf-csel-drop { position:absolute; top:calc(100% + 6px); left:0; right:0; z-index:600; background:var(--card-bg); border:1.5px solid var(--card-border); border-radius:12px; padding:5px; box-shadow:0 12px 40px rgba(0,0,0,.15); min-width:180px; }
.pf-csel-opt { display:flex; align-items:center; gap:9px; padding:9px 10px; border-radius:8px; cursor:pointer; font-size:13px; color:var(--body); transition:.1s; }
.pf-csel-opt:hover { background:var(--mini-bg); }
.pf-csel-opt--on { background:rgba(99,102,241,.07); color:#6366f1; font-weight:600; }
.pf-csel-ico { font-size:15px; flex-shrink:0; line-height:1; }
.pf-csel-chk { width:14px; height:14px; color:#6366f1; margin-left:auto; flex-shrink:0; }
.pf-ta { padding:9px 11px; border-radius:9px; border:1.5px solid var(--card-border); background:var(--input-bg,var(--card-bg)); color:var(--body); font-size:13px; outline:none; transition:.12s; width:100%; resize:vertical; font-family:inherit; }
.pf-ta:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.pf-ta:disabled { opacity:.5; }
.pf-in-suffix { position:relative; display:flex; align-items:center; }
.pf-in-suffix .pf-in { padding-right:42px; }
.pf-suffix { position:absolute; right:11px; font-size:11px; font-weight:600; color:var(--muted); pointer-events:none; }

/* ── Toolbar ── */
.pf-tbar { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px 14px; border-bottom:1.5px solid var(--card-border); }
.pf-tbar-l { display:flex; align-items:center; gap:10px; }
.pf-tbar-r { display:flex; align-items:center; gap:8px; }
.pf-count-chip { padding:3px 10px; border-radius:99px; font-size:12px; font-weight:600; color:#6366f1; background:rgba(99,102,241,.08); border:1px solid rgba(99,102,241,.15); }

/* col visibility */
.pf-col-wrap { position:relative; }
.pf-col-drop { position:absolute; top:calc(100% + 6px); right:0; z-index:500; background:var(--card-bg); border:1.5px solid var(--card-border); border-radius:14px; padding:8px; min-width:240px; box-shadow:0 12px 40px rgba(0,0,0,.15); }
.pf-col-drop-head { padding:6px 10px 10px; font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--card-border); margin-bottom:4px; }
.pf-col-item { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; cursor:pointer; font-size:13px; color:var(--body); transition:.1s; }
.pf-col-item:hover { background:var(--mini-bg); }
.pf-tog { width:34px; height:19px; border-radius:10px; background:var(--card-border); position:relative; transition:.2s; flex-shrink:0; }
.pf-tog--on { background:#6366f1; }
.pf-tog-knob { position:absolute; top:2.5px; left:2.5px; width:14px; height:14px; border-radius:50%; background:#fff; transition:transform .2s; box-shadow:0 1px 4px rgba(0,0,0,.2); }
.pf-tog--on .pf-tog-knob { transform:translateX(15px); }

/* ── Table ── */
.pf-tbl-wrap { overflow-x:auto; }
.pf-tbl { width:100%; border-collapse:collapse; font-size:12px; min-width:960px; table-layout:auto; }
.pf-th { padding:10px 10px; font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.05em; background:var(--mini-bg,#f8fafc); border-bottom:1.5px solid var(--card-border); white-space:nowrap; text-align:left; }
.pf-th--num   { width:36px; text-align:center; color:var(--muted); }
.pf-th--foto  { width:44px; }
.pf-th--tovar { min-width:160px; }
.pf-th--date  { min-width:130px; }
.pf-th--r     { text-align:right; }
.pf-th--summa { color:#6366f1; }
.pf-th--sotuv { color:#10b981; }
.pf-th--act   { width:36px; }
.pf-tr { border-bottom:1px solid var(--card-border); transition:background .1s; }
.pf-tr:hover { background:rgba(99,102,241,.03); }
.pf-tr--jami { background:var(--mini-bg); border-top:2px solid var(--card-border); }
.pf-tr--add { background:rgba(99,102,241,.02); border-bottom:none; }
.pf-td { padding:8px 10px; color:var(--body); vertical-align:middle; }
.pf-td--num  { text-align:center; color:var(--muted); font-size:11px; width:36px; }
.pf-td--foto { width:44px; padding-left:12px; }
.pf-td--name { font-weight:600; font-size:13px; }
.pf-xom { display:inline-flex; margin-left:7px; padding:1px 7px; border-radius:5px; font-size:10px; font-weight:600; background:rgba(79,70,229,.08); color:#4f46e5; border:1px solid rgba(79,70,229,.18); white-space:nowrap; vertical-align:1px; }
.shell.dark .pf-xom { color:#a5b4fc; }
.pf-ombor-hint { font-size:11px; color:#4f46e5; font-weight:500; }
.shell.dark .pf-ombor-hint { color:#a5b4fc; }
.nt-tur { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.nt-tur button { display:flex; flex-direction:column; align-items:flex-start; gap:1px; padding:8px 11px; border-radius:9px; border:1px solid var(--border, #e2e8f0); background:transparent; color:inherit; font:inherit; font-size:13px; font-weight:600; text-align:left; cursor:pointer; }
.nt-tur button small { font-size:11px; font-weight:400; color:var(--muted); }
.nt-tur button.on { border-color:#4f46e5; background:rgba(79,70,229,.06); color:#4f46e5; }
.shell.dark .nt-tur button.on { color:#a5b4fc; }
.pf-td--mono { font-family:'Courier New',monospace; font-size:11px; color:var(--muted); }
.pf-td--r    { text-align:right; }
.pf-td--act  { text-align:center; width:36px; }
.pf-td--jami { font-weight:700; color:var(--title); font-variant-numeric:tabular-nums; }
.pf-td--jami-lbl { font-weight:700; color:var(--title); font-size:12px; }
.pf-td--jami-sum { color:#6366f1; font-size:13px; }
.pf-td-empty { text-align:center; padding:32px; color:var(--muted); font-size:13px; }

.pf-av { width:32px; height:32px; border-radius:9px; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; border:1.5px solid transparent; }
.pf-av--sm { width:26px; height:26px; font-size:10px; border-radius:7px; }
.pf-chip { display:inline-flex; padding:2px 7px; border-radius:5px; font-size:10px; font-weight:600; background:rgba(79,70,229,.08); color:#4f46e5; border:1px solid rgba(79,70,229,.15); white-space:nowrap; }
.pf-chip--xs { padding:1px 5px; font-size:9px; }
.pf-muted { color:var(--muted); font-size:12px; }
.pf-mono  { font-family:'Courier New',monospace; font-size:11px; }
.pf-num   { font-variant-numeric:tabular-nums; }
.pf-summa { font-weight:700; color:var(--title); font-variant-numeric:tabular-nums; font-size:13px; }
.pf-cur        { font-size:10px; color:var(--muted); font-weight:600; }
.pf-num--sotuv { color:#10b981; font-weight:700; }
.pf-cell-in--sotuv:focus { border-color:#10b981; box-shadow:0 0 0 2px rgba(16,185,129,.12); }

/* $ narx — so'm va $ inputlari labellar bilan alohida qatorda, kengroq */
.pf-td--narxcol { min-width:168px; }
.pf-narx-dual { display:flex; flex-direction:column; gap:4px; width:100%; }
.pf-narx-row { display:flex; align-items:center; gap:6px; }
.pf-narx-tag { flex-shrink:0; width:34px; text-align:right; font-size:10px; font-weight:700; color:var(--muted); letter-spacing:.02em; }
.pf-narx-tag--som { color:#6366f1; }
.pf-narx-tag--usd { color:#f59e0b; }
.pf-narx-tag--usd-sotuv { color:#4f46e5; }
.pf-narx-tag--foiz { width:auto; color:#6366f1; }
.pf-th--foiz { color:#6366f1; }
.pf-lock-hint { font-size:11.5px; font-weight:600; color:#b45309; background:rgba(217,119,6,.1); padding:5px 10px; border-radius:8px; white-space:nowrap; }
.pf-dona-jami--zarar { color:#ef4444; font-weight:700; }
.pf-xarajat-hint { font-size:10.5px; color:#f59e0b; font-weight:600; padding-left:2px; white-space:nowrap; }
.pf-dona-jami { display:block; font-size:10.5px; color:#6366f1; font-weight:700; margin-top:2px; white-space:nowrap; }
.pf-cell-in--usd { font-size:12.5px; color:#f59e0b; }
.pf-cell-in--usd:focus { border-color:#f59e0b; background:var(--card-bg); box-shadow:0 0 0 2px rgba(245,158,11,.12); }
.pf-cell-in--usd-sotuv { color:#4f46e5; }
.pf-cell-in--usd-sotuv:focus { border-color:#4f46e5; box-shadow:0 0 0 2px rgba(79,70,229,.12); }
.pf-num-usd { display:block; font-size:10.5px; color:#f59e0b; font-weight:600; margin-top:1px; }
.pf-meta-tag { display:inline-flex; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:600; background:rgba(99,102,241,.08); color:#4f46e5; border:1px solid rgba(99,102,241,.15); white-space:nowrap; }
.pf-meta-tag--dim { background:rgba(148,163,184,.08); color:var(--muted); border-color:var(--card-border); }

/* Cell inputs */
.pf-cell-in { width:100%; border:1.5px solid var(--card-border); border-radius:7px; padding:6px 8px; background:var(--mini-bg); color:var(--body); font-size:12.5px; outline:none; transition:.12s; font-family:inherit; }
.pf-cell-in:focus { border-color:#6366f1; background:var(--card-bg); box-shadow:0 0 0 2px rgba(99,102,241,.12); }
.pf-cell-in:hover:not(:focus) { border-color:#c7d2fe; background:var(--card-bg); }
.pf-cell-in--r { text-align:right; }
.pf-cell-in--narx { min-width:100px; flex:1; }
.pf-cell-in--qty  { min-width:60px; }
.pf-cell-in--date { min-width:130px; font-size:11px; }

.pf-del-btn { width:28px; height:28px; border-radius:7px; border:none; background:transparent; color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:.1s; }
.pf-del-btn:hover { background:rgba(239,68,68,.1); color:#ef4444; }
.pf-del-btn svg { width:14px; height:14px; }

/* ── Inline search row ── */
.pf-inline-wrap { position:relative; padding:4px 0; }
.pf-inline-srch { display:flex; align-items:center; gap:8px; padding:0 10px; height:40px; }
.pf-inline-srch svg { width:14px; height:14px; color:var(--muted); flex-shrink:0; }
.pf-inline-in { flex:1; border:none; background:transparent; outline:none; font-size:13px; color:var(--body); font-family:inherit; }
.pf-inline-in::placeholder { color:var(--muted); font-style:italic; }
.pf-kbd { padding:2px 6px; border-radius:4px; border:1px solid var(--card-border); font-size:10px; color:var(--muted); font-family:'Courier New',monospace; background:var(--mini-bg); }

.pf-inline-drop { position:absolute; top:calc(100% + 4px); left:0; right:0; z-index:400; background:var(--card-bg); border:1.5px solid var(--card-border); border-radius:14px; padding:5px; box-shadow:0 12px 40px rgba(0,0,0,.15); max-height:280px; overflow-y:auto; }
.pf-inline-opt { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:9px; cursor:pointer; transition:.1s; }
.pf-inline-opt:hover { background:var(--mini-bg); }
.pf-inline-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.pf-inline-name { font-size:13px; font-weight:600; color:var(--title); }
.pf-inline-sub  { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--muted); flex-wrap:wrap; }
.pf-inline-meta { display:flex; gap:4px; flex-wrap:wrap; flex-shrink:0; }

/* ── Buttons ── */
.pf-btn { display:inline-flex; align-items:center; gap:6px; height:38px; padding:0 16px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; transition:.12s; border:none; white-space:nowrap; }
.pf-btn svg { width:14px; height:14px; flex-shrink:0; }
.pf-btn:disabled { opacity:.45; cursor:not-allowed; transform:none !important; }
.pf-btn--ghost   { border:1.5px solid var(--card-border); background:transparent; color:var(--muted); }
.pf-btn--ghost:hover:not(:disabled) { background:var(--mini-bg); color:var(--body); }
.pf-btn--outline { border:1.5px solid var(--card-border); background:var(--card-bg); color:var(--body); }
.pf-btn--outline:hover:not(:disabled) { border-color:#6366f1; color:#6366f1; }
.pf-btn--primary { background:linear-gradient(135deg,#6366f1,#4f46e5); color:#fff; box-shadow:0 2px 8px rgba(99,102,241,.3); }
.pf-btn--primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 14px rgba(99,102,241,.4); }
.pf-btn--green   { background:linear-gradient(135deg,#34d399,#10b981); color:#fff; box-shadow:0 2px 8px rgba(16,185,129,.25); }
.pf-btn--green:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 14px rgba(16,185,129,.4); }
.pf-btn--catalog { height:36px; background:rgba(99,102,241,.08); border:1.5px solid rgba(99,102,241,.2); color:#6366f1; font-size:12px; padding:0 13px; }
.pf-btn--catalog:hover:not(:disabled) { background:rgba(99,102,241,.14); }
.pf-btn--cols { height:36px; border:1.5px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:12px; padding:0 12px; }
.pf-btn--cols:hover { border-color:#6366f1; color:#6366f1; }
.pf-btn--cols svg { width:13px; height:13px; }

/* ── Spin ── */
.pf-spin { display:inline-block; width:16px; height:16px; border:2px solid var(--card-border); border-top-color:#6366f1; border-radius:50%; animation:spin .7s linear infinite; flex-shrink:0; }
.pf-spin--sm { width:12px; height:12px; border-width:1.5px; }
@keyframes spin { to { transform:rotate(360deg); } }

/* ── Catalog modal ── */
.cat-overlay { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.5); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
.cat-modal { background:var(--card-bg); border:1.5px solid var(--card-border); border-radius:20px; width:100%; max-width:640px; max-height:90vh; display:flex; flex-direction:column; box-shadow:0 24px 80px rgba(0,0,0,.2); overflow:hidden; }

/* ── Yangi tovar modal ── */
.nt-modal { background:var(--card-bg); border:1.5px solid var(--card-border); border-radius:20px; width:100%; max-width:480px; display:flex; flex-direction:column; box-shadow:0 24px 80px rgba(0,0,0,.2); overflow:hidden; }
.nt-body { padding:20px; display:flex; flex-direction:column; gap:14px; }
.nt-row { display:grid; grid-template-columns:1fr 1fr 90px; gap:10px; }

/* Inline dropdown — "yangi tovar qo'shish" qatori */
.pf-inline-opt--new { border-top:1px dashed var(--card-border); margin-top:2px; padding-top:10px; }
.pf-av--new { background:rgba(99,102,241,.1); color:#6366f1; }
.pf-av--new svg { width:16px; height:16px; }
.pf-inline-name--new { color:#6366f1; font-weight:700; }
.cat-head { display:flex; align-items:center; justify-content:space-between; padding:20px 20px 16px; border-bottom:1.5px solid var(--card-border); gap:12px; }
.cat-head-info { display:flex; align-items:center; gap:12px; }
.cat-head-icon { width:40px; height:40px; border-radius:12px; background:rgba(99,102,241,.1); border:1.5px solid rgba(99,102,241,.2); display:flex; align-items:center; justify-content:center; color:#6366f1; flex-shrink:0; }
.cat-head-icon svg { width:18px; height:18px; }
.cat-title { font-size:16px; font-weight:800; color:var(--title); margin:0; }
.cat-sub   { font-size:12px; color:var(--muted); margin:2px 0 0; }
.cat-close { width:36px; height:36px; border-radius:10px; border:1.5px solid var(--card-border); background:transparent; color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:.12s; }
.cat-close:hover { background:rgba(239,68,68,.08); color:#ef4444; border-color:rgba(239,68,68,.2); }
.cat-close svg { width:14px; height:14px; }

.cat-srch-bar { display:flex; align-items:center; gap:10px; padding:14px 20px; border-bottom:1.5px solid var(--card-border); }
.cat-srch { flex:1; display:flex; align-items:center; gap:9px; height:40px; padding:0 13px; background:var(--mini-bg); border:1.5px solid var(--card-border); border-radius:10px; transition:.12s; }
.cat-srch:focus-within { border-color:#6366f1; background:var(--card-bg); box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.cat-srch svg { width:15px; height:15px; color:var(--muted); flex-shrink:0; }
.cat-srch-in { flex:1; border:none; background:transparent; outline:none; font-size:13px; color:var(--body); font-family:inherit; }
.cat-srch-in::placeholder { color:var(--muted); }
.cat-sel-chip { padding:4px 12px; border-radius:99px; background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.2); color:#6366f1; font-size:12px; font-weight:700; white-space:nowrap; }

.cat-list { flex:1; overflow-y:auto; padding:8px; }
.cat-list::-webkit-scrollbar { width:4px; }
.cat-list::-webkit-scrollbar-track { background:transparent; }
.cat-list::-webkit-scrollbar-thumb { background:var(--card-border); border-radius:2px; }
.cat-loading, .cat-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; padding:48px 20px; color:var(--muted); font-size:13px; }
.cat-empty svg { width:40px; height:40px; opacity:.3; }
.cat-new-btn { display:flex; align-items:center; gap:6px; margin-top:4px; }
.cat-new-btn svg { width:16px; height:16px; opacity:1; }

.cat-item { display:flex; align-items:center; gap:12px; padding:12px; border-radius:12px; cursor:pointer; transition:.12s; border:1.5px solid transparent; margin-bottom:2px; }
.cat-item:hover { background:var(--mini-bg); }
.cat-item--sel { background:rgba(99,102,241,.05); border-color:rgba(99,102,241,.2); }
.cat-item--sel:hover { background:rgba(99,102,241,.08); }
.cat-item-check { width:20px; height:20px; border-radius:6px; border:1.5px solid var(--card-border); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:.12s; }
.cat-item-check--on { background:#6366f1; border-color:#6366f1; }
.cat-item-check--on svg { width:12px; height:12px; color:#fff; }
.cat-item-info { flex:1; min-width:0; }
.cat-item-name { font-size:13px; font-weight:600; color:var(--title); display:block; margin-bottom:4px; }
.cat-item-sub  { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.cat-item-olchov { font-size:11px; color:var(--muted); }
.cat-item-props { display:flex; flex-direction:column; align-items:flex-end; gap:4px; flex-shrink:0; }

.cat-foot { display:flex; align-items:center; justify-content:flex-end; gap:10px; padding:16px 20px; border-top:1.5px solid var(--card-border); background:var(--mini-bg); }

/* ── Overlay ── */
.pf-overlay { position:fixed; inset:0; z-index:400; }

/* ── Transitions ── */
.drop-enter-active, .drop-leave-active { transition:.15s ease; }
.drop-enter-from, .drop-leave-to { opacity:0; transform:translateY(-6px) scale(.97); }

.modal-enter-active, .modal-leave-active { transition:.2s ease; }
.modal-enter-from, .modal-leave-to { opacity:0; }
.modal-enter-active .cat-modal, .modal-leave-active .cat-modal { transition:.2s ease; }
.modal-enter-from .cat-modal, .modal-leave-to .cat-modal { transform:scale(.95) translateY(10px); }

/* ── Yetkazuvchi dropdown ── */
.pf-ytk-drop { min-width:280px; padding:6px 0 4px; max-height:320px; display:flex; flex-direction:column; }
.pf-ytk-srch { display:flex; align-items:center; gap:7px; padding:0 10px 6px; border-bottom:1px solid var(--card-border); margin-bottom:4px; flex-shrink:0; }
.pf-ytk-srch svg { width:13px; height:13px; color:var(--muted); flex-shrink:0; }
.pf-ytk-srch-in { flex:1; border:none; background:transparent; outline:none; font-size:13px; color:var(--body); font-family:inherit; }
.pf-ytk-srch-in::placeholder { color:var(--muted); }
.pf-ytk-list { overflow-y:auto; max-height:220px; }
.pf-ytk-empty { padding:16px 12px; font-size:12px; color:var(--muted); text-align:center; }
.pf-ytk-opt { align-items:center; gap:9px; }
.pf-ytk-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:1px; }
.pf-ytk-ism { font-size:13px; font-weight:600; color:var(--body); }
.pf-ytk-balans { font-size:10.5px; font-weight:600; }
.pf-ytk-balans--red   { color:#ef4444; }
.pf-ytk-balans--green { color:#10b981; }
.pf-ytk-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.pf-ytk-dot--red   { background:#ef4444; box-shadow:0 0 0 2px rgba(239,68,68,.2); }
.pf-ytk-dot--green { background:#10b981; box-shadow:0 0 0 2px rgba(16,185,129,.2); }
.pf-ytk-val { display:flex; align-items:center; gap:7px; }
.pf-ytk-clear { width:18px; height:18px; border:none; background:transparent; color:var(--muted); cursor:pointer; display:flex; align-items:center; justify-content:center; border-radius:4px; padding:0; flex-shrink:0; }
.pf-ytk-clear:hover { background:rgba(239,68,68,.1); color:#ef4444; }
.pf-ytk-clear svg { width:10px; height:10px; }
.pf-ytk-hint { font-size:11px; font-weight:600; color:#f59e0b; margin-top:3px; }
.pf-ytk-hint--ok { color:#10b981; }

/* ── To'lov turi radio ── */
.pf-radio-group { display:flex; gap:8px; flex-wrap:wrap; }
.pf-radio { display:flex; align-items:center; gap:6px; padding:7px 12px; border-radius:9px; border:1.5px solid var(--card-border); cursor:pointer; font-size:12.5px; font-weight:600; color:var(--muted); transition:.12s; user-select:none; }
.pf-radio:hover { border-color:#a5b4fc; color:var(--body); }
.pf-radio--on { border-color:#6366f1; background:rgba(99,102,241,.08); color:#6366f1; }
.pf-radio-dot { width:13px; height:13px; border-radius:50%; border:1.5px solid var(--card-border); transition:.12s; flex-shrink:0; }
.pf-radio-dot--on { border-color:#6366f1; background:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.2); }

/* readonly display */
.pf-in--readonly { display:flex; align-items:center; background:var(--mini-bg); color:var(--muted); cursor:default; }
</style>
