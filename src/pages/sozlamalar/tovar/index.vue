<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import SozDataTable from '../components/SozDataTable.vue'
import type { Tovar } from '../types'
import type { Column } from '../types'
import { api } from '../../../api/api.js'
import { useQidiruv } from '@/composables/useQidiruv'
import ViloyatNarx from '@/components/ViloyatNarx.vue'
import { useForma } from '@/validation/useForma'
import { tozala } from '@/validation/qoidalar'
import * as sx from '@/validation/sxemalar'

// ─── Custom select ────────────────────────────────────────────────────────────
const openSelId = ref<string | null>(null)

function toggleSel(id: string) {
  openSelId.value = openSelId.value === id ? null : id
}

function pickSel(field: keyof TovarForm, value: string) {
  ;(form as Record<string, unknown>)[field] = value
  openSelId.value = null
}

function closeAllSel(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.csel')) openSelId.value = null
}
onMounted(() => {
  document.addEventListener('mousedown', closeAllSel)
  loadTovarlar()
})
onUnmounted(() => document.removeEventListener('mousedown', closeAllSel))

// ─── Reference data ───────────────────────────────────────────────────────────
const SAVDO_YONALISHLARI = ['Направления торговли', 'Retail', 'HoReCa', 'Wholesale']
// Turkumlar — Sozlamalar → Turkumlar'dan (faqat faollari). Tovar saqlanganda nom yuboriladi,
// backend uni turkum jadvaliga bog'laydi (yo'q bo'lsa ochadi) — utils/turkum.utils.js
const TURKUMLAR = ref<string[]>([])
async function turkumlarniYukla() {
  try { const r = await api.get('/turkumlar?faol=true'); TURKUMLAR.value = (Array.isArray(r) ? r : []).map((t: any) => t.nomi) } catch { /* ro'yxat bo'sh qoladi */ }
}
onMounted(turkumlarniYukla)
const OLCHOVLAR = ['kg', 'dona', 'gr', 'litr', 'metr', 'karobka']
const BRENDLAR = ['Coca-Cola', 'Pepsi', 'Nestle', 'Unilever', "O'zbek brendi"]
const GURUHLAR = ['A guruh', 'B guruh', 'C guruh']
const SEGMENTLAR = ['Premium', 'Standart', 'Ekonom']
const ISHLABLAR = ['Coca-Cola Company', 'PepsiCo', "O'zbekiston"]

// ─── API helpers (snake_case ↔ camelCase) ─────────────────────────────────────
function fromApi(r: Record<string, unknown>): Tovar {
  return {
    id:              String(r.id),
    nomi:            String(r.nomi ?? ''),
    turkum:          String(r.turkum ?? ''),
    podkategoriya:   String(r.podkategoriya ?? ''),
    savdoYonalishi:  String(r.savdo_yonalishi ?? ''),
    shtrixKod:       String(r.shtrix_kod ?? ''),
    hajm:            Number(r.hajm ?? 0),
    ogirlik:         Number(r.ogirlik ?? 0),
    blokdagiSoni:    Number(r.blokdagi_soni ?? 1),
    qutidagiBloklar: Number(r.qutidagi_bloklar ?? 1),
    olchovBirligi:   String(r.olchov_birligi ?? 'kg'),
    faol:            Boolean(r.faol),
    turi:            r.turi === 'xom_ashyo' ? 'xom_ashyo' : 'tovar',
  }
}

function toApiBody(f: TovarForm) {
  return {
    nomi:               f.nomi,
    turkum:             f.turkum             || null,
    podkategoriya:      f.podkategoriya      || null,
    savdo_yonalishi:    f.savdoYonalishi     || null,
    shtrix_kod:         f.shtrixKod          || null,
    hajm:               f.hajm,
    ogirlik:            f.ogirlik,
    blokdagi_soni:      f.blokdagiSoni,
    qutidagi_bloklar:   f.qutidagiBloklar,
    olchov_birligi:     f.olchovBirligi      || 'kg',
    brend:              f.brend              || null,
    ishlab_chiqaruvchi: f.ishlabChiqaruvchi  || null,
    segment:            f.segment            || null,
    guruh:              f.guruh              || null,
    tavsif:             f.tavsif             || null,
    faol:               f.faol,
    turi:               f.turi,
  }
}

// ─── Rows ─────────────────────────────────────────────────────────────────────
const allRows = ref<Tovar[]>([])
const loading = ref(false)
const errorMsg = ref('')
const total = ref(0)

// ─── Filters ──────────────────────────────────────────────────────────────────
const search = ref('')
const filterFaol = ref<'all' | 'true' | 'false'>('all')
const filterTurkum = ref('')
const filterTuri = ref<'' | 'tovar' | 'xom_ashyo'>('')

const qd = useQidiruv<any>({
  matn: search, yuklanmoqda: loading,
  kalit: () => [filterFaol.value, filterTurkum.value, filterTuri.value],
  yukla: q => {
    errorMsg.value = ''
    const params = new URLSearchParams({ limit: '200' })
    if (q)                      params.set('search', q)
    if (filterTurkum.value)     params.set('turkum', filterTurkum.value)
    if (filterFaol.value !== 'all') params.set('faol', filterFaol.value)
    if (filterTuri.value)       params.set('turi', filterTuri.value)
    return api.get(`/tovar?${params}`)
  },
  qolla: data => {
    allRows.value = (data.data ?? []).map(fromApi)
    total.value = data.total ?? allRows.value.length
  },
  xato: e => { errorMsg.value = e instanceof Error ? e.message : 'Xatolik' },
})
const loadTovarlar = () => qd.qayta()

watch([filterFaol, filterTurkum, filterTuri], () => loadTovarlar())

const filtered = computed(() => allRows.value)

// ─── Columns ──────────────────────────────────────────────────────────────────
const columns: Column<Tovar>[] = [
  { key: 'id',              label: 'ID',             sortable: true, width: '80px' },
  { key: 'nomi',            label: 'Nomi',           sortable: true },
  { key: 'turkum',          label: 'Turkum',         sortable: true },
  { key: 'turi',            label: 'Turi',           sortable: true },
  { key: 'podkategoriya',   label: 'Podkategoriya' },
  { key: 'savdoYonalishi',  label: "Savdo yo'nalishi" },
  { key: 'shtrixKod',       label: 'Shtrix-kod' },
]

// ─── Add dropdown ─────────────────────────────────────────────────────────────
const addOpen = ref(false)

// ─── Extended form (includes fields beyond Tovar interface) ───────────────────
interface TovarForm extends Omit<Tovar, 'id'> {
  // Qo'shimcha
  saralash: number
  saqlashMuddati: number
  bloklardaSotish: boolean
  mml: boolean
  powerSku: boolean
  shtrixKod2: string
  gtin: string
  artikul: string
  sapKod: string
  kod: string
  tavsif: string
  // Audit
  brend: string
  guruh: string
  segment: string
  ishlabChiqaruvchi: string
  // IKPU
  ikpu: string
  tnvedKod: string
  // Upakovka
  upakovkaTuri: string
  upakovkaHajm: number
  upakovkaOgirlik: number
}

type ModalMode = 'add' | 'edit' | 'view' | null
const modalMode = ref<ModalMode>(null)
const formTab = ref<'asosiy' | 'qoshimcha' | 'audit' | 'ikpu' | 'foto' | 'upakovka' | 'viloyat'>('asosiy')

const emptyForm = (): TovarForm => ({
  nomi: '', turkum: '', podkategoriya: '', savdoYonalishi: '',
  shtrixKod: '', hajm: 1, ogirlik: 1, blokdagiSoni: 1, qutidagiBloklar: 1,
  olchovBirligi: 'kg', faol: true, turi: 'tovar',
  saralash: 500, saqlashMuddati: 0, bloklardaSotish: true, mml: true, powerSku: false,
  shtrixKod2: '', gtin: '', artikul: '', sapKod: '', kod: '', tavsif: '',
  brend: '', guruh: '', segment: '', ishlabChiqaruvchi: '',
  ikpu: '', tnvedKod: '',
  upakovkaTuri: '', upakovkaHajm: 1, upakovkaOgirlik: 1,
})

const form = reactive<TovarForm>(emptyForm())
// Qoidalar backend maydon nomlari bo'yicha — forma API ko'rinishiga o'girib tekshiriladi
const f = useForma(sx.tovar, () => toApiBody(form))
const editId = ref<string | null>(null)

const modalTitle = computed(() =>
  modalMode.value === 'add' ? 'Mahsulot yaratish'
  : modalMode.value === 'edit' ? 'Mahsulotni tahrirlash'
  : "Mahsulot ma'lumotlari"
)
const readonly = computed(() => modalMode.value === 'view')

const TAB_LIST = [
  { key: 'asosiy',    label: 'Asosiy',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'qoshimcha', label: "Qo'shimcha", icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6' },
  { key: 'audit',     label: 'Audit',     icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'ikpu',      label: 'IKPU',      icon: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2' },
  { key: 'foto',      label: 'Foto',      icon: 'M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z M15 13a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'viloyat',   label: 'Viloyat narxlari', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6' },
  { key: 'upakovka',  label: 'Upakovka',  icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
] as const
// Viloyat narxlari faqat saqlangan savdo tovarida (xom ashyoga narx qo'yilmaydi, yangi tovarda hali id yo'q)
const tablar = computed(() => TAB_LIST.filter(t => t.key !== 'viloyat' || (!!editId.value && form.turi === 'tovar')))
watch(tablar, (t) => { if (!t.some(x => x.key === formTab.value)) formTab.value = 'asosiy' })

function openAdd() {
  addOpen.value = false
  Object.assign(form, emptyForm())
  editId.value = null
  formTab.value = 'asosiy'
  saveError.value = ''
  f.tozala()
  modalMode.value = 'add'
}

function openEdit(row: Tovar) {
  Object.assign(form, { ...emptyForm(), ...row })
  editId.value = row.id
  formTab.value = 'asosiy'
  saveError.value = ''
  f.tozala()
  modalMode.value = 'edit'
}

function openView(row: Tovar) {
  Object.assign(form, { ...emptyForm(), ...row })
  editId.value = row.id
  formTab.value = 'asosiy'
  saveError.value = ''
  f.tozala()
  modalMode.value = 'view'
}

// ─── Toast ────────────────────────────────────────────────────────────────────
interface Toast { id: number; type: 'error' | 'warning' | 'success'; msg: string }
const toasts = ref<Toast[]>([])
let toastId = 0

function showToast(msg: string, type: Toast['type'] = 'error') {
  const id = ++toastId
  toasts.value.push({ id, type, msg })
  setTimeout(() => { toasts.value = toasts.value.filter(t => t.id !== id) }, 4000)
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateForm(): boolean {
  const errors: string[] = []
  if (!form.nomi?.trim())         errors.push("Mahsulot nomi kiritilmagan")
  if (!form.turkum?.trim())       errors.push("Turkum tanlanmagan")
  if (!form.savdoYonalishi?.trim()) errors.push("Savdo yo'nalishi tanlanmagan")
  if (!form.olchovBirligi?.trim()) errors.push("O'lchov birligi tanlanmagan")
  if (errors.length) {
    errors.forEach(msg => showToast(msg, 'warning'))
    formTab.value = 'asosiy'
    return false
  }
  return true
}

const saving = ref(false)
const saveError = ref('')

async function saveForm(addAnother = false) {
  if (saving.value) return
  saveError.value = ''
  if (!validateForm()) return
  if (!f.tekshir()) { saveError.value = f.umumiy.value; formTab.value = 'asosiy'; return }
  saving.value = true
  try {
    const body = tozala(sx.tovar, toApiBody(form))
    let javob: any = null
    if (editId.value && modalMode.value === 'edit') {
      javob = await api.patch(`/tovar/${editId.value}`, body)
    } else {
      await api.post('/tovar', body)
    }
    await loadTovarlar()
    // Turi o'zgargan bo'lsa server qoldiqni yangi turi omboriga ko'chirgan
    const k = javob?.kochirildi
    if (k && k.dona > 0) showToast(`"${form.nomi}": ${k.dona} ${form.olchovBirligi} ${k.dan}dan ${k.ga}ga o'tkazildi`, 'success')
    if (addAnother) {
      showToast(`"${form.nomi}" saqlandi`, 'success')
      Object.assign(form, emptyForm()); editId.value = null; formTab.value = 'asosiy'
      f.tozala()
    } else {
      showToast(`"${form.nomi}" saqlandi`, 'success')
      modalMode.value = null
    }
  } catch (e: unknown) {
    const msg = f.server(e) || 'Xatolik'
    saveError.value = msg
    showToast(msg, 'error')
  } finally {
    saving.value = false
  }
}

async function deleteRow(row: Tovar) {
  if (!confirm(`"${row.nomi}" mahsulotini o'chirmoqchimisiz?`)) return
  try {
    await api.delete(`/tovar/${row.id}`)
    await loadTovarlar()
  } catch (e: unknown) {
    showToast(e instanceof Error ? e.message : 'Xatolik', 'error')
  }
}

// ─── Bulk Add ─────────────────────────────────────────────────────────────────
interface BulkRow {
  id: number
  nomi: string
  turkum: string
  savdoYonalishi: string
  shtrixKod: string
  olchovBirligi: string
  blokdagiSoni: number
  qutidagiBloklar: number
  faol: boolean
  error: string
}

const bulkOpen = ref(false)
const bulkSaving = ref(false)
let bulkIdSeq = 0

function newBulkRow(): BulkRow {
  return { id: ++bulkIdSeq, nomi: '', turkum: '', savdoYonalishi: '', shtrixKod: '', olchovBirligi: 'kg', blokdagiSoni: 1, qutidagiBloklar: 1, faol: true, error: '' }
}

const bulkRows = ref<BulkRow[]>([newBulkRow(), newBulkRow(), newBulkRow()])

function openBulkAdd() {
  addOpen.value = false
  bulkRows.value = [newBulkRow(), newBulkRow(), newBulkRow()]
  bulkOpen.value = true
}

function addBulkRow() {
  bulkRows.value.push(newBulkRow())
}

function removeBulkRow(id: number) {
  if (bulkRows.value.length === 1) return
  bulkRows.value = bulkRows.value.filter(r => r.id !== id)
}

function dupBulkRow(row: BulkRow) {
  const idx = bulkRows.value.findIndex(r => r.id === row.id)
  const copy = { ...row, id: ++bulkIdSeq, error: '' }
  bulkRows.value.splice(idx + 1, 0, copy)
}

function genBulkBarcode(row: BulkRow) {
  const prefix = '200'
  const body = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('')
  const digits = (prefix + body).split('').map(Number)
  const check = (10 - (digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10
  row.shtrixKod = prefix + body + check
}

function fillDownField(idx: number, field: keyof BulkRow) {
  const src = bulkRows.value[idx]
  if (!src) return
  const val = src[field]
  for (let i = idx + 1; i < bulkRows.value.length; i++) {
    ;(bulkRows.value[i] as Record<string, unknown>)[field as string] = val
  }
}

const bulkValidCount = computed(() => bulkRows.value.filter(r => r.nomi.trim()).length)

async function saveBulk() {
  let hasErr = false
  bulkRows.value.forEach(r => {
    r.error = ''
    if (!r.nomi.trim()) { r.error = 'Nomi kerak'; hasErr = true }
  })
  if (hasErr) { showToast('Nomi bo\'sh qatorlar bor', 'warning'); return }

  bulkSaving.value = true
  let saved = 0
  for (const row of bulkRows.value) {
    try {
      await api.post('/tovar', {
        nomi:             row.nomi,
        turkum:           row.turkum           || null,
        savdo_yonalishi:  row.savdoYonalishi   || null,
        shtrix_kod:       row.shtrixKod        || null,
        olchov_birligi:   row.olchovBirligi    || 'kg',
        blokdagi_soni:    row.blokdagiSoni,
        qutidagi_bloklar: row.qutidagiBloklar,
        faol:             row.faol,
      })
      saved++
    } catch (e: unknown) {
      row.error = e instanceof Error ? e.message : 'Xatolik'
    }
  }

  await loadTovarlar()
  bulkSaving.value = false

  if (saved === bulkRows.value.length) {
    showToast(`${saved} ta mahsulot saqlandi`, 'success')
    bulkOpen.value = false
  } else {
    showToast(`${saved} ta saqlandi, ${bulkRows.value.length - saved} ta xatolik`, 'warning')
    bulkRows.value = bulkRows.value.filter(r => r.error)
  }
}

function generateBarcode() {
  const prefix = '200'
  const body = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('')
  const digits = (prefix + body).split('').map(Number)
  const check = (10 - (digits.reduce((s, d, i) => s + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) % 10
  form.shtrixKod = prefix + body + check
}

function numStep(field: keyof TovarForm, delta: number, min = 0) {
  const cur = Number(form[field]) || 0
  ;(form as Record<string, unknown>)[field] = Math.max(min, cur + delta)
}
</script>

<template>
  <div class="tv-page">
    <!-- Header -->
    <div class="tv-hd">
      <h2 class="tv-title">Tovar</h2>
      <button class="sv-link-btn">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clip-rule="evenodd"/></svg>
        Bog'liq mahsulotlar
      </button>
    </div>

    <!-- Filters -->
    <div class="tv-filters">
      <select class="flt-sel" v-model="filterTuri" aria-label="Turi">
        <option value="">Barcha turlar</option>
        <option value="tovar">Savdo tovarlari</option>
        <option value="xom_ashyo">Xom ashyo</option>
      </select>
      <select class="flt-sel" v-model="filterFaol">
        <option value="all">Faol, Faol emas</option>
        <option value="true">Faol</option>
        <option value="false">Faol emas</option>
      </select>
      <select class="flt-sel" v-model="filterTurkum">
        <option value="">Turkum</option>
        <option v-for="t in TURKUMLAR" :key="t" :value="t">{{ t }}</option>
      </select>
      <select class="flt-sel"><option value="">Podkategoriya</option></select>
      <select class="flt-sel"><option value="">Guruh</option></select>
      <select class="flt-sel"><option value="">Savdo yo'nalishi</option></select>
      <select class="flt-sel"><option value="">Brend</option></select>
    </div>

    <!-- Toolbar -->
    <div class="tv-toolbar">
      <div class="tv-tl">
        <div class="add-dd">
          <button class="add-btn" @click="addOpen = !addOpen">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
            Qo'shish
            <svg class="chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          </button>
          <Transition name="dd">
            <div v-if="addOpen" class="add-menu">
              <button class="add-menu-item" @click="openAdd">
                <span class="ami-ic ami-ic--add"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg></span>
                <span class="ami-txt"><span class="ami-lbl">Yangi mahsulot</span><span class="ami-sub">Bir mahsulot qo'shish</span></span>
              </button>
              <button class="add-menu-item" @click="openBulkAdd">
                <span class="ami-ic ami-ic--multi"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clip-rule="evenodd"/></svg></span>
                <span class="ami-txt"><span class="ami-lbl">Bir nechta mahsulot</span><span class="ami-sub">Bir vaqtda ko'p qo'shish</span></span>
              </button>
              <div class="add-menu-sep"/>
              <button class="add-menu-item">
                <span class="ami-ic ami-ic--import"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg></span>
                <span class="ami-txt"><span class="ami-lbl">Excel'dan import</span><span class="ami-sub">Yangilash ham mumkin</span></span>
              </button>
              <button class="add-menu-item">
                <span class="ami-ic ami-ic--dl"><svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clip-rule="evenodd"/></svg></span>
                <span class="ami-txt"><span class="ami-lbl">Shablonni yuklab olish</span><span class="ami-sub">Faqat faol mahsulotlar</span></span>
              </button>
            </div>
          </Transition>
        </div>
        <button class="tv-btn-outline">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"/></svg>
          Saralash
        </button>
        <button class="tv-btn-success">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
          Faol qilish
        </button>
        <button class="tv-btn-outline">
          <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
          Guruhli tahrirlash
        </button>
      </div>
      <div class="tv-tr">
        <div class="view-tog">
          <button class="view-tog-btn view-tog-btn--on">
            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
          </button>
          <button class="view-tog-btn">
            <svg viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          </button>
        </div>
        <button class="tv-btn-outline">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
          Excel
        </button>
        <div class="srch-box">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
          <input v-model="search" maxlength="100" @keydown.enter="qd.darhol()" placeholder="Qidirish..." class="srch-in"/>
        </div>
      </div>
    </div>

    <!-- Info bar -->
    <div class="tv-info-bar">
      <div class="tv-info-left">
        <span v-if="loading" class="tv-info-count tv-loading">Yuklanmoqda...</span>
        <span v-else-if="errorMsg" class="tv-info-count tv-error-txt">{{ errorMsg }}</span>
        <span v-else class="tv-info-count">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
          <strong>{{ total }}</strong> ta mahsulot
          <em v-if="total > allRows.length" class="tv-qisman"> — dastlabki {{ allRows.length }} tasi ko'rsatilmoqda, qolganini qidiruv yoki filtr bilan toping</em>
        </span>
      </div>
      <div class="tv-info-right">
        <span class="tv-info-stat tv-info-stat--on"><span class="tv-info-dot tv-info-dot--on"/>{{ allRows.filter(r=>r.faol).length }} faol</span>
        <span class="tv-info-sep">·</span>
        <span class="tv-info-stat tv-info-stat--off"><span class="tv-info-dot tv-info-dot--off"/>{{ allRows.filter(r=>!r.faol).length }} faol emas</span>
      </div>
    </div>

    <!-- Table -->
    <SozDataTable :columns="columns" :rows="filtered" :selectable="true" row-key="id"
      @edit="openEdit" @delete="deleteRow" @view="openView">
      <template #cell-nomi="{ value }">
        <div class="cell-nomi">
          <div class="cell-nomi-av">{{ String(value).charAt(0).toUpperCase() }}</div>
          <span class="cell-nomi-txt">{{ value }}</span>
        </div>
      </template>
      <template #cell-turkum="{ value }">
        <span class="cell-tag cell-tag--blue">{{ value || '—' }}</span>
      </template>
      <template #cell-savdoYonalishi="{ value }">
        <span class="cell-muted">{{ value || '—' }}</span>
      </template>
      <template #cell-turi="{ value }">
        <span :class="['tur-badge', value === 'xom_ashyo' && 'tur-badge--xom']">{{ value === 'xom_ashyo' ? 'Xom ashyo' : 'Savdo tovari' }}</span>
      </template>
      <template #cell-faol="{ value }">
        <span :class="['faol-badge', value ? 'faol-badge--on' : 'faol-badge--off']">
          <span class="faol-dot"/>{{ value ? 'Faol' : 'Faol emas' }}
        </span>
      </template>
    </SozDataTable>

    <div v-if="addOpen" class="overlay-close" @click="addOpen = false"/>

    <!-- ═══════════════════════ BULK ADD MODAL ═══════════════════════ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="bulkOpen" class="modal-overlay" @click.self="bulkOpen = false">
          <div class="bulk-box">

            <!-- Header -->
            <div class="modal-hd">
              <div class="modal-hd-left">
                <div class="modal-hd-ic">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                    <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clip-rule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <h2 class="modal-title">Bir nechta mahsulot qo'shish</h2>
                  <p class="modal-sub">{{ bulkRows.length }} ta qator · {{ bulkValidCount }} tasi to'ldirilgan</p>
                </div>
              </div>
              <div class="modal-hd-right">
                <button class="bulk-add-row-btn" @click="addBulkRow">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                  Qator qo'shish
                </button>
                <button class="modal-close" @click="bulkOpen = false">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>

            <!-- Column headers -->
            <div class="bulk-thead">
              <div class="bulk-th bw-num">#</div>
              <div class="bulk-th bw-nomi">Mahsulot nomi <span class="req">*</span></div>
              <div class="bulk-th bw-flex">Turkum</div>
              <div class="bulk-th bw-flex">Savdo yo'nalishi</div>
              <div class="bulk-th bw-shtrix">Shtrix-kod</div>
              <div class="bulk-th bw-olchov">O'lchov</div>
              <div class="bulk-th bw-soni">Blok</div>
              <div class="bulk-th bw-soni">Quti</div>
              <div class="bulk-th bw-faol">Faol</div>
              <div class="bulk-th bw-acts"></div>
            </div>

            <!-- Rows -->
            <div class="bulk-body">
              <div v-for="(row, idx) in bulkRows" :key="row.id"
                :class="['bulk-row', row.error && 'bulk-row--err']">

                <div class="bulk-td bw-num">
                  <span class="bulk-num">{{ idx + 1 }}</span>
                </div>

                <div class="bulk-td bw-nomi">
                  <input v-model="row.nomi" class="bulk-in" :class="row.error && 'bulk-in--err'"
                    placeholder="Mahsulot nomi..."/>
                  <span v-if="row.error" class="bulk-row-err">{{ row.error }}</span>
                </div>

                <div class="bulk-td bw-flex">
                  <input v-model="row.turkum" class="bulk-in" placeholder="Turkum..."
                    list="bulk-turkum-list"/>
                  <datalist id="bulk-turkum-list">
                    <option v-for="t in TURKUMLAR" :key="t" :value="t"/>
                  </datalist>
                  <button v-if="row.turkum && idx < bulkRows.length - 1" class="bulk-fill-btn"
                    @click="fillDownField(idx, 'turkum')" title="Quyidagilarga nusxalash">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                  </button>
                </div>

                <div class="bulk-td bw-flex">
                  <input v-model="row.savdoYonalishi" class="bulk-in" placeholder="Yo'nalish..."
                    list="bulk-savdo-list"/>
                  <datalist id="bulk-savdo-list">
                    <option v-for="s in SAVDO_YONALISHLARI" :key="s" :value="s"/>
                  </datalist>
                  <button v-if="row.savdoYonalishi && idx < bulkRows.length - 1" class="bulk-fill-btn"
                    @click="fillDownField(idx, 'savdoYonalishi')" title="Quyidagilarga nusxalash">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                  </button>
                </div>

                <div class="bulk-td bw-shtrix">
                  <div class="bulk-shtrix">
                    <input v-model="row.shtrixKod" class="bulk-in" placeholder="Kod..."/>
                    <button class="bulk-gen-btn" @click="genBulkBarcode(row)" title="Generate">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
                    </button>
                  </div>
                </div>

                <div class="bulk-td bw-olchov">
                  <select v-model="row.olchovBirligi" class="bulk-sel">
                    <option v-for="o in OLCHOVLAR" :key="o" :value="o">{{ o }}</option>
                  </select>
                </div>

                <div class="bulk-td bw-soni">
                  <input v-model.number="row.blokdagiSoni" type="number" min="1" class="bulk-in bulk-in--num"/>
                </div>

                <div class="bulk-td bw-soni">
                  <input v-model.number="row.qutidagiBloklar" type="number" min="1" class="bulk-in bulk-in--num"/>
                </div>

                <div class="bulk-td bw-faol">
                  <button type="button" class="bulk-toggle" :class="row.faol && 'bulk-toggle--on'"
                    @click="row.faol = !row.faol">
                    <span class="bulk-toggle-knob"/>
                  </button>
                </div>

                <div class="bulk-td bw-acts">
                  <button class="bulk-act-btn bulk-act-btn--dup" @click="dupBulkRow(row)" title="Nusxalash">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z"/><path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z"/></svg>
                  </button>
                  <button class="bulk-act-btn bulk-act-btn--del" @click="removeBulkRow(row.id)"
                    :disabled="bulkRows.length === 1" title="O'chirish">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                  </button>
                </div>

              </div>
            </div>

            <!-- Footer -->
            <div class="modal-ft">
              <button class="bulk-add-row-btn bulk-add-row-btn--ghost" @click="addBulkRow">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                Yana qator
              </button>
              <span style="flex:1"/>
              <span class="bulk-count-badge">{{ bulkValidCount }} / {{ bulkRows.length }} tayyor</span>
              <button class="mft-cancel" @click="bulkOpen = false" :disabled="bulkSaving">Bekor qilish</button>
              <button class="mft-save-next" @click="saveBulk" :disabled="bulkSaving || bulkValidCount === 0">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293z"/></svg>
                {{ bulkSaving ? 'Saqlanmoqda...' : `${bulkValidCount} ta saqlash` }}
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast notifications -->
    <Teleport to="body">
      <div class="toast-stack">
        <TransitionGroup name="toast">
          <div v-for="t in toasts" :key="t.id" :class="['toast', `toast--${t.type}`]">
            <div class="toast-ic">
              <svg v-if="t.type==='warning'" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
              <svg v-else-if="t.type==='error'" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
              <svg v-else viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
            </div>
            <span class="toast-msg">{{ t.msg }}</span>
            <button class="toast-close" @click="toasts = toasts.filter(x => x.id !== t.id)">
              <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
            </button>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>

    <!-- ═══════════════════════ MODAL ═══════════════════════ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="modalMode !== null" class="modal-overlay" @click.self="modalMode = null">
          <div class="modal-box">

            <!-- Modal header -->
            <div class="modal-hd">
              <div class="modal-hd-left">
                <div class="modal-hd-ic">
                  <svg viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="modal-title">{{ modalTitle }}</h2>
                  <p class="modal-sub" v-if="form.nomi">{{ form.nomi }}</p>
                </div>
              </div>
              <div class="modal-hd-right">
                <span v-if="!readonly" :class="['modal-mode-tag', modalMode==='add' ? 'tag--add' : 'tag--edit']">
                  {{ modalMode === 'add' ? 'Yangi' : 'Tahrirlash' }}
                </span>
                <span v-else class="modal-mode-tag tag--view">Ko'rish</span>
                <button class="modal-close" @click="modalMode = null">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                </button>
              </div>
            </div>

            <!-- Tabs -->
            <div class="modal-tabs">
              <button v-for="t in tablar" :key="t.key"
                :class="['mtab', formTab === t.key && 'mtab--on']"
                @click="formTab = t.key">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="t.icon"/>
                </svg>
                {{ t.label }}
              </button>
            </div>

            <!-- Body -->
            <div class="modal-body">

              <!-- ── ASOSIY ── -->
              <div v-if="formTab==='asosiy'" class="fm-grid">
                <!-- Nomi full width -->
                <div class="fg-field fg-full">
                  <label class="fg-lbl">Mahsulot nomi <span class="req">*</span></label>
                  <input v-model="form.nomi" v-maydon:nomi="f" class="fg-in" placeholder="Masalan: Coca Cola 0.5L" :disabled="readonly"/>
                </div>

                <!-- Tovar turi: savdo tovari yoki xom ashyo (alohida omborda, sotilmaydi) -->
                <div class="fg-field fg-full">
                  <label class="fg-lbl">Turi</label>
                  <div class="tur-seg" role="radiogroup" aria-label="Tovar turi">
                    <button type="button" role="radio" :aria-checked="form.turi === 'tovar'" class="tur-opt" :class="form.turi === 'tovar' && 'tur-opt--on'" :disabled="readonly" @click="form.turi = 'tovar'">
                      <b>Savdo tovari</b><small>Asosiy skladda turadi, agent va Van Sell sotadi</small>
                    </button>
                    <button type="button" role="radio" :aria-checked="form.turi === 'xom_ashyo'" class="tur-opt" :class="form.turi === 'xom_ashyo' && 'tur-opt--on'" :disabled="readonly" @click="form.turi = 'xom_ashyo'">
                      <b>Xom ashyo</b><small>Xom ashyo omborida turadi, sotilmaydi, ishlab chiqarishga beriladi</small>
                    </button>
                  </div>
                  <p v-if="modalMode === 'edit'" class="tur-hint">Turi o'zgartirilsa, skladdagi qoldig'i avtomatik yangi turi omboriga o'tkaziladi.</p>
                </div>

                <div class="fg-field">
                  <label class="fg-lbl">Turkum <span class="req">*</span></label>
                  <div class="csel" :class="openSelId==='turkum' && 'csel--open'">
                    <button type="button" class="csel-btn" :disabled="readonly" @click="toggleSel('turkum')">
                      <span :class="form.turkum ? 'csel-val' : 'csel-ph'">{{ form.turkum || 'Tanlang...' }}</span>
                      <svg class="csel-ic" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                    </button>
                    <Transition name="csel-drop">
                      <div v-if="openSelId==='turkum'" class="csel-drop">
                        <button type="button" class="csel-opt" :class="form.turkum==='' && 'csel-opt--sel'" @click="pickSel('turkum','')">
                          <span>Tanlang...</span>
                          <svg v-if="form.turkum===''" class="csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        </button>
                        <button v-for="t in TURKUMLAR" :key="t" type="button" class="csel-opt" :class="form.turkum===t && 'csel-opt--sel'" @click="pickSel('turkum', t)">
                          <span>{{ t }}</span>
                          <svg v-if="form.turkum===t" class="csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        </button>
                      </div>
                    </Transition>
                  </div>
                </div>

                <div class="fg-field">
                  <label class="fg-lbl">Savdo yo'nalishi <span class="req">*</span></label>
                  <div class="csel" :class="openSelId==='savdo' && 'csel--open'">
                    <div class="combo-wrap">
                      <input v-model="form.savdoYonalishi" v-maydon:savdo_yonalishi.ota="f" class="combo-in" placeholder="Tanlang yoki yozing..." :disabled="readonly" @focus="toggleSel('savdo')" @input="openSelId='savdo'"/>
                      <button type="button" class="combo-arrow" :disabled="readonly" @click="toggleSel('savdo')">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                      </button>
                    </div>
                    <Transition name="csel-drop">
                      <div v-if="openSelId==='savdo'" class="csel-drop">
                        <button v-for="s in SAVDO_YONALISHLARI.filter(x => !form.savdoYonalishi || x.toLowerCase().includes(form.savdoYonalishi.toLowerCase()))"
                          :key="s" type="button" class="csel-opt" :class="form.savdoYonalishi===s && 'csel-opt--sel'"
                          @mousedown.prevent="pickSel('savdoYonalishi', s)">
                          <span>{{ s }}</span>
                          <svg v-if="form.savdoYonalishi===s" class="csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        </button>
                        <div v-if="form.savdoYonalishi && !SAVDO_YONALISHLARI.some(x=>x===form.savdoYonalishi)" class="csel-opt csel-opt--new" @mousedown.prevent="openSelId=null">
                          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                          <span>"{{ form.savdoYonalishi }}" — yangi qiymat</span>
                        </div>
                      </div>
                    </Transition>
                  </div>
                </div>

                <div class="fg-field">
                  <label class="fg-lbl">Podkategoriya</label>
                  <div class="csel" :class="openSelId==='podkat' && 'csel--open'">
                    <div class="combo-wrap">
                      <input v-model="form.podkategoriya" v-maydon:podkategoriya.ota="f" class="combo-in" placeholder="Tanlang yoki yozing..." :disabled="readonly" @focus="toggleSel('podkat')" @input="openSelId='podkat'"/>
                      <button v-if="form.podkategoriya && !readonly" type="button" class="combo-clear" @mousedown.prevent="form.podkategoriya=''">
                        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                      </button>
                    </div>
                    <Transition name="csel-drop">
                      <div v-if="openSelId==='podkat'" class="csel-drop">
                        <div v-if="!form.podkategoriya" class="csel-empty">Qidirish uchun yozing...</div>
                        <template v-else>
                          <div class="csel-opt csel-opt--new" @mousedown.prevent="openSelId=null">
                            <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                            <span>"{{ form.podkategoriya }}" — yangi qiymat</span>
                          </div>
                        </template>
                      </div>
                    </Transition>
                  </div>
                </div>

                <div class="fg-field">
                  <label class="fg-lbl">O'lchov birligi</label>
                  <div class="csel" :class="openSelId==='olchov' && 'csel--open'">
                    <button type="button" class="csel-btn" :disabled="readonly" @click="toggleSel('olchov')">
                      <span class="csel-val">{{ form.olchovBirligi }}</span>
                      <svg class="csel-ic" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                    </button>
                    <Transition name="csel-drop">
                      <div v-if="openSelId==='olchov'" class="csel-drop">
                        <button v-for="o in OLCHOVLAR" :key="o" type="button" class="csel-opt" :class="form.olchovBirligi===o && 'csel-opt--sel'" @click="pickSel('olchovBirligi', o)">
                          <span>{{ o }}</span>
                          <svg v-if="form.olchovBirligi===o" class="csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        </button>
                      </div>
                    </Transition>
                  </div>
                </div>

                <!-- Divider label -->
                <div class="fg-section-title fg-full">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a8 8 0 100 16A8 8 0 0010 2zm1 11a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                  Miqdor ko'rsatkichlari
                </div>

                <div class="fg-field">
                  <label class="fg-lbl">Hajm</label>
                  <div class="fg-num">
                    <button class="fg-num-btn" @click="numStep('hajm', -1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                    <input v-model.number="form.hajm" v-maydon:hajm.ota="f" type="number" min="0" step="any" class="fg-num-in" :disabled="readonly"/>
                    <button class="fg-num-btn" @click="numStep('hajm', 1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                    </button>
                  </div>
                </div>

                <div class="fg-field">
                  <label class="fg-lbl">Og'irlik (kg)</label>
                  <div class="fg-num">
                    <button class="fg-num-btn" @click="numStep('ogirlik', -1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                    <input v-model.number="form.ogirlik" v-maydon:ogirlik.ota="f" type="number" min="0" step="any" class="fg-num-in" :disabled="readonly"/>
                    <button class="fg-num-btn" @click="numStep('ogirlik', 1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                    </button>
                  </div>
                </div>

                <div class="fg-field">
                  <label class="fg-lbl">Blokdagi mahsulotlar</label>
                  <div class="fg-num">
                    <button class="fg-num-btn" @click="numStep('blokdagiSoni', -1, 1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                    <input v-model.number="form.blokdagiSoni" v-maydon:blokdagi_soni.ota="f" type="number" min="0" step="any" class="fg-num-in" :disabled="readonly"/>
                    <button class="fg-num-btn" @click="numStep('blokdagiSoni', 1, 1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                    </button>
                  </div>
                </div>

                <div class="fg-field">
                  <label class="fg-lbl">Qutidagi bloklar</label>
                  <div class="fg-num">
                    <button class="fg-num-btn" @click="numStep('qutidagiBloklar', -1, 1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                    <input v-model.number="form.qutidagiBloklar" v-maydon:qutidagi_bloklar.ota="f" type="number" min="0" step="any" class="fg-num-in" :disabled="readonly"/>
                    <button class="fg-num-btn" @click="numStep('qutidagiBloklar', 1, 1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                    </button>
                  </div>
                </div>
              </div>

              <!-- ── QO'SHIMCHA ── -->
              <div v-else-if="formTab==='qoshimcha'" class="fm-grid">
                <div class="fg-field">
                  <label class="fg-lbl">Saralash</label>
                  <input v-model.number="form.saralash" type="number" class="fg-in" :disabled="readonly"/>
                </div>
                <div class="fg-field">
                  <label class="fg-lbl">Saqlash muddati (kunlarda)</label>
                  <input v-model.number="form.saqlashMuddati" type="number" class="fg-in" :disabled="readonly"/>
                </div>

                <div class="fg-full">
                  <label class="fg-lbl fg-lbl--sm">Xususiyatlar</label>
                  <div class="fg-checks">
                    <label class="fg-check" :class="form.faol && 'fg-check--on'">
                      <input type="checkbox" v-model="form.faol" :disabled="readonly"/>
                      <span class="fg-check-box"><svg v-if="form.faol" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                      Faol
                    </label>
                    <label class="fg-check" :class="form.bloklardaSotish && 'fg-check--on'">
                      <input type="checkbox" v-model="form.bloklardaSotish" :disabled="readonly"/>
                      <span class="fg-check-box"><svg v-if="form.bloklardaSotish" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                      Bloklarda sotish
                    </label>
                    <label class="fg-check" :class="form.mml && 'fg-check--on'">
                      <input type="checkbox" v-model="form.mml" :disabled="readonly"/>
                      <span class="fg-check-box"><svg v-if="form.mml" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                      MML
                    </label>
                    <label class="fg-check" :class="form.powerSku && 'fg-check--on'">
                      <input type="checkbox" v-model="form.powerSku" :disabled="readonly"/>
                      <span class="fg-check-box"><svg v-if="form.powerSku" viewBox="0 0 12 10" fill="none"><path d="M1 5l3.5 3.5L11 1" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
                      POWER SKU
                    </label>
                  </div>
                </div>

                <div class="fg-section-title fg-full">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>
                  Kodlar va identifikatorlar
                </div>

                <div class="fg-field">
                  <label class="fg-lbl">Shtrix-kod</label>
                  <div class="shtrix-row">
                    <div class="fg-in-icon" style="flex:1">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 4a1 1 0 011-1h1a1 1 0 010 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h1a1 1 0 010 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h1a1 1 0 010 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h1a1 1 0 010 2H4a1 1 0 01-1-1zm6-12a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1zm0 4a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1zm5-12a1 1 0 011-1h1a1 1 0 010 2h-1a1 1 0 01-1-1zm0 4a1 1 0 011-1h1a1 1 0 010 2h-1a1 1 0 01-1-1zm0 4a1 1 0 011-1h1a1 1 0 010 2h-1a1 1 0 01-1-1zm0 4a1 1 0 011-1h1a1 1 0 010 2h-1a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                      <input v-model="form.shtrixKod" v-maydon:shtrix_kod.ota="f" class="fg-in-field" placeholder="0000000000000" :disabled="readonly"/>
                    </div>
                    <button v-if="!readonly" type="button" class="gen-btn" @click="generateBarcode" title="Avtomatik generatsiya">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>
                      Generate
                    </button>
                  </div>
                </div>
                <div class="fg-field">
                  <label class="fg-lbl">GTIN</label>
                  <input v-model="form.gtin" class="fg-in" placeholder="Global Trade Identifier Number" :disabled="readonly"/>
                </div>
                <div class="fg-field">
                  <label class="fg-lbl">Artikul</label>
                  <input v-model="form.artikul" class="fg-in" placeholder="Artikul raqami" :disabled="readonly"/>
                </div>
                <div class="fg-field">
                  <label class="fg-lbl">SAP kod</label>
                  <input v-model="form.sapKod" class="fg-in" placeholder="SAP kod" :disabled="readonly"/>
                </div>
                <div class="fg-field">
                  <label class="fg-lbl">Kod</label>
                  <input v-model="form.kod" class="fg-in" placeholder="Ichki kod" :disabled="readonly"/>
                </div>

                <div class="fg-full fg-field">
                  <label class="fg-lbl">Tavsif</label>
                  <textarea v-model="form.tavsif" v-maydon:tavsif="f" class="fg-ta" rows="3" placeholder="Mahsulot haqida qisqacha tavsif..." :disabled="readonly"/>
                </div>
              </div>

              <!-- ── AUDIT ── -->
              <div v-else-if="formTab==='audit'" class="fm-grid">
                <div class="fg-field">
                  <label class="fg-lbl">Brend</label>
                  <div class="csel" :class="openSelId==='brend' && 'csel--open'">
                    <button type="button" class="csel-btn" :disabled="readonly" @click="toggleSel('brend')">
                      <span :class="form.brend ? 'csel-val' : 'csel-ph'">{{ form.brend || 'Tanlang...' }}</span>
                      <svg class="csel-ic" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                    </button>
                    <Transition name="csel-drop">
                      <div v-if="openSelId==='brend'" class="csel-drop">
                        <button type="button" class="csel-opt" :class="form.brend==='' && 'csel-opt--sel'" @click="pickSel('brend','')"><span>Tanlang...</span></button>
                        <button v-for="b in BRENDLAR" :key="b" type="button" class="csel-opt" :class="form.brend===b && 'csel-opt--sel'" @click="pickSel('brend', b)">
                          <span>{{ b }}</span>
                          <svg v-if="form.brend===b" class="csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        </button>
                      </div>
                    </Transition>
                  </div>
                </div>
                <div class="fg-field">
                  <label class="fg-lbl">Guruh</label>
                  <div class="csel" :class="openSelId==='guruh' && 'csel--open'">
                    <button type="button" class="csel-btn" :disabled="readonly" @click="toggleSel('guruh')">
                      <span :class="form.guruh ? 'csel-val' : 'csel-ph'">{{ form.guruh || 'Tanlang...' }}</span>
                      <svg class="csel-ic" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                    </button>
                    <Transition name="csel-drop">
                      <div v-if="openSelId==='guruh'" class="csel-drop">
                        <button type="button" class="csel-opt" :class="form.guruh==='' && 'csel-opt--sel'" @click="pickSel('guruh','')"><span>Tanlang...</span></button>
                        <button v-for="g in GURUHLAR" :key="g" type="button" class="csel-opt" :class="form.guruh===g && 'csel-opt--sel'" @click="pickSel('guruh', g)">
                          <span>{{ g }}</span>
                          <svg v-if="form.guruh===g" class="csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        </button>
                      </div>
                    </Transition>
                  </div>
                </div>
                <div class="fg-field">
                  <label class="fg-lbl">Segment</label>
                  <div class="csel" :class="openSelId==='segment' && 'csel--open'">
                    <button type="button" class="csel-btn" :disabled="readonly" @click="toggleSel('segment')">
                      <span :class="form.segment ? 'csel-val' : 'csel-ph'">{{ form.segment || 'Tanlang...' }}</span>
                      <svg class="csel-ic" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                    </button>
                    <Transition name="csel-drop">
                      <div v-if="openSelId==='segment'" class="csel-drop">
                        <button type="button" class="csel-opt" :class="form.segment==='' && 'csel-opt--sel'" @click="pickSel('segment','')"><span>Tanlang...</span></button>
                        <button v-for="s in SEGMENTLAR" :key="s" type="button" class="csel-opt" :class="form.segment===s && 'csel-opt--sel'" @click="pickSel('segment', s)">
                          <span>{{ s }}</span>
                          <svg v-if="form.segment===s" class="csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        </button>
                      </div>
                    </Transition>
                  </div>
                </div>
                <div class="fg-field">
                  <label class="fg-lbl">Ishlab chiqaruvchi</label>
                  <div class="csel" :class="openSelId==='ishlab' && 'csel--open'">
                    <button type="button" class="csel-btn" :disabled="readonly" @click="toggleSel('ishlab')">
                      <span :class="form.ishlabChiqaruvchi ? 'csel-val' : 'csel-ph'">{{ form.ishlabChiqaruvchi || 'Tanlang...' }}</span>
                      <svg class="csel-ic" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                    </button>
                    <Transition name="csel-drop">
                      <div v-if="openSelId==='ishlab'" class="csel-drop">
                        <button type="button" class="csel-opt" :class="form.ishlabChiqaruvchi==='' && 'csel-opt--sel'" @click="pickSel('ishlabChiqaruvchi','')"><span>Tanlang...</span></button>
                        <button v-for="i in ISHLABLAR" :key="i" type="button" class="csel-opt" :class="form.ishlabChiqaruvchi===i && 'csel-opt--sel'" @click="pickSel('ishlabChiqaruvchi', i)">
                          <span>{{ i }}</span>
                          <svg v-if="form.ishlabChiqaruvchi===i" class="csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        </button>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>

              <!-- ── IKPU ── -->
              <div v-else-if="formTab==='ikpu'" class="fm-grid">
                <div class="fg-field fg-full">
                  <label class="fg-lbl">IKPU kodi</label>
                  <div class="fg-in-icon">
                    <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 2a8 8 0 100 16A8 8 0 0010 2zm0 3a1 1 0 011 1v4a1 1 0 01-.293.707l-2.5 2.5a1 1 0 01-1.414-1.414L9 9.586V6a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                    <input v-model="form.ikpu" class="fg-in-field" placeholder="00000000000000" :disabled="readonly"/>
                  </div>
                  <span class="fg-hint">Soliq tizimidagi identifikatsiya kodi</span>
                </div>
                <div class="fg-field fg-full">
                  <label class="fg-lbl">TN VED kodi</label>
                  <input v-model="form.tnvedKod" class="fg-in" placeholder="0000000000" :disabled="readonly"/>
                  <span class="fg-hint">Tashqi iqtisodiy faoliyat tovar nomenklaturasi</span>
                </div>

                <div class="fg-full">
                  <div class="ikpu-info-card">
                    <div class="ikpu-info-ic">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>
                    </div>
                    <div>
                      <p class="ikpu-info-title">IKPU kodi haqida</p>
                      <p class="ikpu-info-txt">IKPU (mahsulot va xizmatlarning identifikatsiya kodi) — soliq hisoboti uchun zarur bo'lgan mahsulot identifikatsiya kodi. Kodni Soliq qo'mitasining rasmiy saytidan topishingiz mumkin.</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ── FOTO ── -->
              <div v-else-if="formTab==='foto'" class="fm-grid">
                <div class="fg-full">
                  <div class="foto-upload-zone">
                    <div class="foto-upload-ic">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                      </svg>
                    </div>
                    <p class="foto-upload-title">Rasmlarni bu yerga tashlang</p>
                    <p class="foto-upload-sub">PNG, JPG, WEBP — maksimal 5 MB</p>
                    <button class="foto-upload-btn" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd"/></svg>
                      Fayl tanlash
                    </button>
                  </div>
                </div>
              </div>

              <!-- ── UPAKOVKA ── -->
              <div v-else-if="formTab==='viloyat'" class="fm-grid">
                <ViloyatNarx :tovar-id="editId"/>
              </div>

              <div v-else-if="formTab==='upakovka'" class="fm-grid">
                <div class="fg-field fg-full">
                  <label class="fg-lbl">Upakovka turi</label>
                  <div class="csel" :class="openSelId==='upakov' && 'csel--open'">
                    <button type="button" class="csel-btn" :disabled="readonly" @click="toggleSel('upakov')">
                      <span :class="form.upakovkaTuri ? 'csel-val' : 'csel-ph'">{{ form.upakovkaTuri || 'Tanlang...' }}</span>
                      <svg class="csel-ic" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                    </button>
                    <Transition name="csel-drop">
                      <div v-if="openSelId==='upakov'" class="csel-drop">
                        <button type="button" class="csel-opt" :class="form.upakovkaTuri==='' && 'csel-opt--sel'" @click="pickSel('upakovkaTuri','')"><span>Tanlang...</span></button>
                        <button v-for="u in ['Quti','Paket','Shisha','Bochka']" :key="u" type="button" class="csel-opt" :class="form.upakovkaTuri===u && 'csel-opt--sel'" @click="pickSel('upakovkaTuri', u)">
                          <span>{{ u }}</span>
                          <svg v-if="form.upakovkaTuri===u" class="csel-chk" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                        </button>
                      </div>
                    </Transition>
                  </div>
                </div>
                <div class="fg-field">
                  <label class="fg-lbl">Upakovka hajmi</label>
                  <div class="fg-num">
                    <button class="fg-num-btn" @click="numStep('upakovkaHajm', -1, 1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                    <input v-model.number="form.upakovkaHajm" type="number" class="fg-num-in" :disabled="readonly"/>
                    <button class="fg-num-btn" @click="numStep('upakovkaHajm', 1, 1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                    </button>
                  </div>
                </div>
                <div class="fg-field">
                  <label class="fg-lbl">Upakovka og'irligi (kg)</label>
                  <div class="fg-num">
                    <button class="fg-num-btn" @click="numStep('upakovkaOgirlik', -1, 1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                    <input v-model.number="form.upakovkaOgirlik" type="number" class="fg-num-in" :disabled="readonly"/>
                    <button class="fg-num-btn" @click="numStep('upakovkaOgirlik', 1, 1)" :disabled="readonly">
                      <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                    </button>
                  </div>
                </div>
              </div>

            </div><!-- /modal-body -->

            <!-- Footer -->
            <div class="modal-ft">
              <span v-if="saveError" class="mft-error">{{ saveError }}</span>
              <button class="mft-cancel" @click="modalMode = null" :disabled="saving">
                <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                Bekor qilish
              </button>
              <template v-if="!readonly">
                <button class="mft-save" @click="saveForm(false)" :disabled="saving">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293z"/></svg>
                  {{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
                </button>
                <button class="mft-save-next" @click="saveForm(true)" :disabled="saving">
                  <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
                  Saqlash va yana qo'shish
                </button>
              </template>
              <button v-else class="mft-save" @click="modalMode = 'edit'">
                <svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                Tahrirlash
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Page ──────────────────────────────────────────────────────────────────── */
.tv-page { display:flex; flex-direction:column; gap:14px; }
.tv-hd { display:flex; align-items:center; justify-content:space-between; }
.tv-title { font-size:20px; font-weight:700; color:var(--title); margin:0; }
.sv-link-btn { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 14px; border-radius:8px; border:none; background:linear-gradient(135deg,#8b5cf6,#7c3aed); color:#fff; font-size:12px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(139,92,246,.3); }
.sv-link-btn svg { width:14px; height:14px; }

.tv-filters { display:flex; gap:8px; flex-wrap:wrap; }
.flt-sel { height:34px; padding:0 10px; border-radius:9px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:12px; cursor:pointer; outline:none; }

.tv-toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.tv-tl,.tv-tr { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

.add-dd { position:relative; }
.add-btn { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 14px; border-radius:9px; border:none; background:linear-gradient(135deg,#a78bfa,#8b5cf6); color:#fff; font-size:12px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(139,92,246,.28); }
.add-btn svg { width:14px; height:14px; }
.add-btn .chevron { width:12px; height:12px; opacity:.7; }
.add-menu { position:absolute; top:calc(100% + 6px); left:0; z-index:200; background:var(--card-bg); border:1px solid var(--card-border); border-radius:14px; padding:7px; min-width:260px; box-shadow:0 8px 32px rgba(0,0,0,.14); }
.add-menu-item { display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; border-radius:9px; border:none; background:transparent; cursor:pointer; transition:.12s; text-align:left; }
.add-menu-item:hover { background:var(--mini-bg); }
.ami-ic { width:32px; height:32px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ami-ic svg { width:15px; height:15px; }
.ami-ic--add   { background:rgba(139,92,246,.1);  color:#8b5cf6; }
.ami-ic--multi { background:rgba(16,185,129,.1);  color:#10b981; }
.ami-ic--import{ background:rgba(245,158,11,.1);  color:#f59e0b; }
.ami-ic--dl    { background:rgba(124,58,237,.1);  color:#7c3aed; }
.ami-txt { display:flex; flex-direction:column; gap:1px; }
.ami-lbl { font-size:13px; font-weight:600; color:var(--title); }
.ami-sub { font-size:11px; color:var(--muted); }
.add-menu-sep { height:1px; background:var(--card-border); margin:5px 0; }

.tv-btn-outline { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 12px; border-radius:9px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:12px; font-weight:500; cursor:pointer; transition:.12s; }
.tv-btn-outline:hover { border-color:#8b5cf6; color:#8b5cf6; }
.tv-btn-outline svg { width:14px; height:14px; }
.tv-btn-success { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 12px; border-radius:9px; border:1px solid rgba(16,185,129,.3); background:rgba(16,185,129,.08); color:#10b981; font-size:12px; font-weight:600; cursor:pointer; }
.tv-btn-success svg { width:14px; height:14px; }

.view-tog { display:inline-flex; gap:2px; padding:3px; background:var(--seg-track); border:1px solid var(--seg-brd); border-radius:10px; }
.view-tog-btn { width:28px; height:28px; border-radius:7px; border:none; background:transparent; color:var(--seg-ink); cursor:pointer; display:flex; align-items:center; justify-content:center; }
.view-tog-btn svg { width:14px; height:14px; }
.view-tog-btn--on { background:var(--seg-on-bg); color:var(--seg-on-ink); box-shadow:var(--seg-on-sh); }

.srch-box { display:flex; align-items:center; gap:7px; height:34px; padding:0 11px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:9px; min-width:180px; }
.srch-box svg { width:14px; height:14px; color:var(--muted); flex-shrink:0; }
.srch-in { border:none; background:transparent; outline:none; font-size:12px; color:var(--body); width:100%; }
.srch-in::placeholder { color:var(--muted); }

/* Info bar */
.tv-info-bar { display:flex; align-items:center; justify-content:space-between; padding:8px 14px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:10px; gap:12px; flex-wrap:wrap; }
.tv-info-left { display:flex; align-items:center; }
.tv-info-count { display:inline-flex; align-items:center; gap:6px; font-size:12px; color:var(--muted); }
.tv-qisman { font-style:normal; color:#b45309; }
.tv-info-count svg { width:13px; height:13px; flex-shrink:0; }
.tv-info-count strong { color:var(--title); font-weight:700; font-size:13px; }
.tv-info-filtered { color:var(--muted); font-size:11px; }
.tv-info-right { display:flex; align-items:center; gap:8px; }
.tv-info-stat { display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:500; }
.tv-info-stat--on  { color:#10b981; }
.tv-info-stat--off { color:#94a3b8; }
.tv-info-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.tv-info-dot--on  { background:#10b981; box-shadow:0 0 0 2px rgba(16,185,129,.2); }
.tv-info-dot--off { background:#94a3b8; }
.tv-info-sep { color:var(--card-border); }

.overlay-close { position:fixed; inset:0; z-index:90; }
.tv-loading  { color: var(--muted); font-style: italic; }
.tv-error-txt { color: #ef4444; font-size: 12px; }

/* Table cells */
.cell-nomi { display:flex; align-items:center; gap:9px; }
.cell-nomi-av { width:30px; height:30px; border-radius:8px; flex-shrink:0; background:linear-gradient(135deg,rgba(139,92,246,.15),rgba(139,92,246,.15)); color:#8b5cf6; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; border:1px solid rgba(139,92,246,.15); }
.cell-nomi-txt { font-weight:500; color:var(--title); }
.cell-tag { display:inline-flex; padding:2px 9px; border-radius:6px; font-size:11px; font-weight:600; }
.cell-tag--blue { background:rgba(124,58,237,.08); color:#7c3aed; border:1px solid rgba(124,58,237,.15); }
.cell-muted { color:var(--muted); font-size:12px; }
.tur-badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:99px; font-size:11px; font-weight:600; background:rgba(100,116,139,.08); color:#475569; border:1px solid rgba(100,116,139,.18); white-space:nowrap; }
.tur-badge--xom { background:rgba(124,58,237,.08); color:#7c3aed; border-color:rgba(124,58,237,.2); }
.shell.dark .tur-badge { color:#cbd5e1; }
.shell.dark .tur-badge--xom { color:#c4b5fd; }
.tur-seg { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.tur-opt { display:flex; flex-direction:column; align-items:flex-start; gap:2px; padding:10px 12px; border-radius:10px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font:inherit; text-align:left; cursor:pointer; }
.tur-opt b { font-size:13px; font-weight:600; }
.tur-opt small { font-size:11.5px; color:var(--muted); line-height:1.35; }
.tur-opt:hover:not(:disabled) { border-color:#c4b5fd; }
.tur-opt--on { border-color:#7c3aed; background:rgba(124,58,237,.06); box-shadow:0 0 0 3px rgba(124,58,237,.1); }
.tur-opt--on b { color:#7c3aed; }
.shell.dark .tur-opt--on b { color:#c4b5fd; }
.tur-opt:disabled { cursor:default; }
.tur-hint { margin:2px 0 0; font-size:11.5px; color:var(--muted); }
@media (max-width:560px) { .tur-seg { grid-template-columns:1fr; } }
.faol-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:99px; font-size:11px; font-weight:600; }
.faol-badge--on  { background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.2); }
.faol-badge--off { background:rgba(239,68,68,.06); color:#ef4444; border:1px solid rgba(239,68,68,.15); }
.faol-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; background:currentColor; }

/* ── Dropdown transition ────────────────────────────────────────────────────── */
.dd-enter-active,.dd-leave-active { transition:.15s ease; }
.dd-enter-from,.dd-leave-to { opacity:0; transform:translateY(-6px) scale(.97); }

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL
══════════════════════════════════════════════════════════════════════════════ */
.modal-overlay {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(0,0,0,.5);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

.modal-box {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  width: 100%; max-width: 860px;
  max-height: 90vh;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,.2);
  overflow: hidden;
}

/* Modal header */
.modal-hd {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px 0;
  flex-shrink: 0;
}
.modal-hd-left { display:flex; align-items:center; gap:14px; }
.modal-hd-ic {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(139,92,246,.15), rgba(139,92,246,.15));
  border: 1px solid rgba(139,92,246,.2);
  display: flex; align-items: center; justify-content: center;
}
.modal-hd-ic svg { width: 20px; height: 20px; color: #8b5cf6; }
.modal-title { font-size: 17px; font-weight: 700; color: var(--title); margin: 0; line-height: 1.2; }
.modal-sub { font-size: 12px; color: var(--muted); margin: 2px 0 0; }
.modal-hd-right { display:flex; align-items:center; gap:8px; }
.modal-mode-tag { display:inline-flex; padding:3px 10px; border-radius:99px; font-size:11px; font-weight:700; }
.tag--add  { background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.2); }
.tag--edit { background:rgba(245,158,11,.1); color:#f59e0b; border:1px solid rgba(245,158,11,.2); }
.tag--view { background:rgba(139,92,246,.08); color:#8b5cf6; border:1px solid rgba(139,92,246,.18); }
.modal-close {
  width: 34px; height: 34px; border-radius: 10px;
  border: 1px solid var(--card-border); background: var(--mini-bg);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: .12s; color: var(--muted);
}
.modal-close:hover { background: rgba(239,68,68,.1); color: #ef4444; border-color: rgba(239,68,68,.25); }
.modal-close svg { width: 14px; height: 14px; }

/* Modal tabs */
.modal-tabs {
  display: flex; gap: 2px;
  padding: 16px 24px 0;
  border-bottom: 1.5px solid var(--card-border);
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}
.modal-tabs::-webkit-scrollbar { display: none; }
.mtab {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  border: none; background: transparent;
  color: var(--seg-ink); font-size: 13px; font-weight: 500;
  cursor: pointer; white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -1.5px;
  transition: .15s;
  border-radius: 6px 6px 0 0;
}
.mtab svg { width: 14px; height: 14px; flex-shrink: 0; }
.mtab:hover:not(.mtab--on) { color: var(--seg-ink-h); background: var(--seg-track); }
.mtab--on { color:var(--tab-on-ink); border-bottom-color:var(--tab-line); font-weight:600; }

/* Modal body */
.modal-body {
  flex: 1; overflow-y: auto; padding: 24px;
  scrollbar-width: thin;
  scrollbar-color: var(--card-border) transparent;
}

/* Form grid */
.fm-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}
.fg-full { grid-column: 1 / -1; }

.fg-section-title {
  display: flex; align-items: center; gap: 7px;
  font-size: 11px; font-weight: 700; color: var(--muted);
  text-transform: uppercase; letter-spacing: .06em;
  padding: 8px 0 2px;
  border-top: 1px solid var(--card-border);
}
.fg-section-title svg { width: 13px; height: 13px; flex-shrink: 0; }

.fg-field { display: flex; flex-direction: column; gap: 6px; }
.fg-lbl { font-size: 12px; font-weight: 600; color: var(--muted); }
.fg-lbl--sm { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
.req { color: #ef4444; }
.fg-hint { font-size: 11px; color: var(--muted); margin-top: 2px; }

/* Input */
.fg-in {
  height: 40px; padding: 0 13px;
  border-radius: 10px; border: 1.5px solid var(--card-border);
  background: var(--card-bg); color: var(--body); font-size: 13px;
  outline: none; transition: .15s; width: 100%;
}
.fg-in:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.1); }
.fg-in:disabled { opacity: .55; cursor: not-allowed; }

/* Select with custom arrow */
.fg-sel-wrap { position: relative; }
.fg-sel {
  height: 40px; padding: 0 36px 0 13px;
  border-radius: 10px; border: 1.5px solid var(--card-border);
  background: var(--card-bg); color: var(--body); font-size: 13px;
  outline: none; transition: .15s; width: 100%;
  appearance: none; cursor: pointer;
}
.fg-sel:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.1); }
.fg-sel:disabled { opacity: .55; cursor: not-allowed; }
.fg-sel-ic { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: var(--muted); pointer-events: none; }

/* Input with icon */
.fg-in-icon {
  display: flex; align-items: center; gap: 10px;
  height: 40px; padding: 0 13px;
  border-radius: 10px; border: 1.5px solid var(--card-border);
  background: var(--card-bg); transition: .15s;
}
.fg-in-icon:focus-within { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.1); }
.fg-in-icon svg { width: 15px; height: 15px; color: var(--muted); flex-shrink: 0; }
.fg-in-field { flex: 1; border: none; background: transparent; color: var(--body); font-size: 13px; outline: none; }

/* Textarea */
.fg-ta {
  padding: 10px 13px;
  border-radius: 10px; border: 1.5px solid var(--card-border);
  background: var(--card-bg); color: var(--body); font-size: 13px;
  outline: none; transition: .15s; width: 100%; resize: vertical; font-family: inherit;
  min-height: 80px;
}
.fg-ta:focus { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.1); }
.fg-ta:disabled { opacity: .55; cursor: not-allowed; }

/* Number stepper */
.fg-num {
  display: flex; align-items: center;
  border: 1.5px solid var(--card-border); border-radius: 10px;
  overflow: hidden; background: var(--card-bg); height: 40px;
}
.fg-num-btn {
  width: 40px; height: 40px; border: none; background: transparent;
  color: var(--muted); cursor: pointer; transition: .12s;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.fg-num-btn svg { width: 14px; height: 14px; }
.fg-num-btn:first-child { border-right: 1.5px solid var(--card-border); }
.fg-num-btn:last-child  { border-left:  1.5px solid var(--card-border); }
.fg-num-btn:hover:not(:disabled) { background: var(--mini-bg); color: #8b5cf6; }
.fg-num-btn:disabled { opacity: .4; cursor: not-allowed; }
.fg-num-in { flex: 1; border: none; background: transparent; text-align: center; font-size: 14px; font-weight: 600; color: var(--title); outline: none; }

/* Checkbox group */
.fg-checks { display: flex; flex-wrap: wrap; gap: 8px; }
.fg-check {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 9px;
  border: 1.5px solid var(--card-border); background: var(--card-bg);
  font-size: 13px; color: var(--body); cursor: pointer;
  transition: .12s; user-select: none;
}
.fg-check input { display: none; }
.fg-check:hover { border-color: #a78bfa; }
.fg-check--on { border-color: #8b5cf6; background: rgba(139,92,246,.06); color: #8b5cf6; font-weight: 600; }
.fg-check-box {
  width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
  border: 1.5px solid var(--card-border);
  background: var(--card-bg);
  display: flex; align-items: center; justify-content: center;
  transition: .12s;
}
.fg-check--on .fg-check-box { background: linear-gradient(135deg,#a78bfa,#8b5cf6); border-color: #8b5cf6; box-shadow: 0 2px 6px rgba(139,92,246,.3); }
.fg-check-box svg { width: 10px; height: 8px; }

/* IKPU info card */
.ikpu-info-card {
  display: flex; gap: 12px;
  padding: 14px 16px;
  background: rgba(124,58,237,.05);
  border: 1px solid rgba(124,58,237,.15);
  border-radius: 12px;
}
.ikpu-info-ic { width: 36px; height: 36px; border-radius: 9px; background: rgba(124,58,237,.1); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ikpu-info-ic svg { width: 18px; height: 18px; color: #7c3aed; }
.ikpu-info-title { font-size: 13px; font-weight: 600; color: var(--title); margin: 0 0 4px; }
.ikpu-info-txt { font-size: 12px; color: var(--muted); margin: 0; line-height: 1.5; }

/* Photo upload */
.foto-upload-zone {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border: 2px dashed var(--card-border); border-radius: 14px;
  padding: 48px 20px; gap: 10px; cursor: pointer; transition: .15s;
}
.foto-upload-zone:hover { border-color: #a78bfa; background: rgba(139,92,246,.03); }
.foto-upload-ic { width: 56px; height: 56px; border-radius: 14px; background: var(--mini-bg); display:flex; align-items:center; justify-content:center; }
.foto-upload-ic svg { width: 28px; height: 28px; color: var(--muted); opacity: .6; }
.foto-upload-title { font-size: 14px; font-weight: 600; color: var(--title); margin: 0; }
.foto-upload-sub { font-size: 12px; color: var(--muted); margin: 0; }
.foto-upload-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 14px; border-radius: 9px; margin-top: 4px;
  border: 1px solid rgba(139,92,246,.3); background: rgba(139,92,246,.08); color: #8b5cf6;
  font-size: 12px; font-weight: 600; cursor: pointer; transition: .12s;
}
.foto-upload-btn:hover { background: rgba(139,92,246,.14); }
.foto-upload-btn svg { width: 13px; height: 13px; }
.foto-upload-btn:disabled { opacity: .5; cursor: not-allowed; }

/* Modal footer */
.modal-ft {
  display: flex; justify-content: flex-end; align-items: center; gap: 8px;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--card-border);
  flex-shrink: 0;
}
.mft-cancel {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 16px; border-radius: 10px;
  border: 1.5px solid var(--card-border); background: transparent;
  color: var(--muted); font-size: 13px; cursor: pointer; transition: .12s;
}
.mft-cancel:hover { background: var(--mini-bg); color: var(--body); }
.mft-cancel svg { width: 13px; height: 13px; }
.mft-save {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 18px; border-radius: 10px;
  border: 1.5px solid var(--card-border); background: var(--card-bg);
  color: var(--body); font-size: 13px; font-weight: 600; cursor: pointer; transition: .15s;
}
.mft-save:hover { border-color: #8b5cf6; color: #8b5cf6; }
.mft-save svg { width: 14px; height: 14px; }
.mft-save-next {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 20px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #a78bfa, #8b5cf6);
  color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
  box-shadow: 0 3px 10px rgba(139,92,246,.35); transition: .15s;
}
.mft-save-next:hover { transform: translateY(-1px); box-shadow: 0 5px 16px rgba(139,92,246,.45); }
.mft-save-next svg { width: 14px; height: 14px; }
.mft-error { flex: 1; font-size: 12px; color: #ef4444; padding: 0 4px; }

/* Modal transition */
.modal-fade-enter-active, .modal-fade-leave-active { transition: .22s ease; }
.modal-fade-enter-active .modal-box, .modal-fade-leave-active .modal-box { transition: .22s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .modal-box, .modal-fade-leave-to .modal-box { transform: scale(.96) translateY(12px); }

/* ── Custom Select ──────────────────────────────────────────────────────────── */
.csel { position: relative; }

.csel-btn {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; height: 40px; padding: 0 13px;
  border-radius: 10px; border: 1.5px solid var(--card-border);
  background: var(--card-bg); cursor: pointer;
  transition: border-color .15s, box-shadow .15s;
  font-size: 13px; text-align: left;
}
.csel-btn:hover:not(:disabled) { border-color: #a78bfa; }
.csel--open .csel-btn { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.1); }
.csel-btn:disabled { opacity: .55; cursor: not-allowed; }

.csel-val { color: var(--body); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.csel-ph  { color: var(--muted); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.csel-ic {
  width: 14px; height: 14px; color: var(--muted); flex-shrink: 0;
  transition: transform .2s;
}
.csel--open .csel-ic { transform: rotate(180deg); color: #8b5cf6; }

.csel-drop {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 600;
  background: var(--card-bg);
  border: 1.5px solid var(--card-border);
  border-radius: 12px;
  padding: 5px;
  box-shadow: 0 8px 30px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.08);
  max-height: 220px; overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--card-border) transparent;
}

.csel-opt {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 9px 12px; border-radius: 8px;
  border: none; background: transparent; cursor: pointer;
  font-size: 13px; color: var(--body); text-align: left;
  transition: background .1s;
}
.csel-opt:hover { background: var(--mini-bg); }
.csel-opt--sel { color: #8b5cf6; font-weight: 600; background: rgba(139,92,246,.06); }
.csel-opt--sel:hover { background: rgba(139,92,246,.1); }

.csel-chk { width: 14px; height: 14px; flex-shrink: 0; color: #8b5cf6; }

/* Combo input (select + free type) */
.combo-wrap {
  display: flex; align-items: center;
  border: 1.5px solid var(--card-border); border-radius: 10px;
  background: var(--card-bg); height: 40px; overflow: hidden;
  transition: border-color .15s, box-shadow .15s;
}
.combo-wrap:focus-within { border-color: #8b5cf6; box-shadow: 0 0 0 3px rgba(139,92,246,.1); }
.combo-in {
  flex: 1; border: none; background: transparent; outline: none;
  padding: 0 12px; font-size: 13px; color: var(--body); height: 100%;
}
.combo-in::placeholder { color: var(--muted); }
.combo-in:disabled { opacity: .55; cursor: not-allowed; }
.combo-arrow {
  width: 34px; height: 100%; border: none; background: transparent;
  color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; transition: color .12s;
}
.combo-arrow:hover { color: #8b5cf6; }
.combo-arrow svg { width: 14px; height: 14px; }
.combo-clear {
  width: 28px; height: 100%; border: none; background: transparent;
  color: var(--muted); cursor: pointer; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.combo-clear:hover { color: #ef4444; }
.combo-clear svg { width: 11px; height: 11px; }

.csel-opt--new {
  display: flex; align-items: center; gap: 7px;
  color: #8b5cf6; font-size: 12px; font-weight: 600;
  padding: 9px 12px; border-radius: 8px; cursor: pointer;
  border-top: 1px solid var(--card-border); margin-top: 3px;
}
.csel-opt--new:hover { background: rgba(139,92,246,.06); }
.csel-opt--new svg { width: 13px; height: 13px; flex-shrink: 0; }
.csel-empty { padding: 10px 12px; font-size: 12px; color: var(--muted); text-align: center; }

/* Shtrix-kod row */
.shtrix-row { display: flex; gap: 8px; align-items: center; }
.gen-btn {
  display: inline-flex; align-items: center; gap: 5px;
  height: 40px; padding: 0 12px; border-radius: 10px; flex-shrink: 0;
  border: 1.5px solid rgba(139,92,246,.3); background: rgba(139,92,246,.07);
  color: #8b5cf6; font-size: 12px; font-weight: 600; cursor: pointer; transition: .12s;
  white-space: nowrap;
}
.gen-btn:hover { background: rgba(139,92,246,.14); border-color: #8b5cf6; }
.gen-btn svg { width: 13px; height: 13px; }

/* Custom select dropdown transition */
.csel-drop-enter-active, .csel-drop-leave-active { transition: .15s ease; }
.csel-drop-enter-from, .csel-drop-leave-to { opacity: 0; transform: translateY(-6px) scale(.97); }

/* ── Bulk Add Modal ─────────────────────────────────────────────────────────── */
.bulk-box {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  width: 100%; max-width: 1080px;
  max-height: 92vh;
  display: flex; flex-direction: column;
  box-shadow: 0 24px 80px rgba(0,0,0,.22);
  overflow: hidden;
}

.bulk-add-row-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 14px; border-radius: 9px;
  border: 1.5px solid rgba(139,92,246,.3); background: rgba(139,92,246,.08);
  color: #8b5cf6; font-size: 12px; font-weight: 600; cursor: pointer; transition: .12s;
}
.bulk-add-row-btn:hover { background: rgba(139,92,246,.15); }
.bulk-add-row-btn svg { width: 13px; height: 13px; }
.bulk-add-row-btn--ghost {
  border-style: dashed; background: transparent;
}
.bulk-add-row-btn--ghost:hover { background: rgba(139,92,246,.06); }

.bulk-thead {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 16px;
  background: var(--mini-bg);
  border-top: 1px solid var(--card-border);
  border-bottom: 1px solid var(--card-border);
  flex-shrink: 0;
}
.bulk-th {
  font-size: 11px; font-weight: 700; color: var(--muted);
  text-transform: uppercase; letter-spacing: .05em;
  flex: 1; min-width: 0;
}
.bulk-th.bw-num    { flex: 0 0 32px; text-align: center; }
.bulk-th.bw-nomi   { flex: 2; }
.bulk-th.bw-flex   { flex: 1; }
.bulk-th.bw-shtrix { flex: 1.4; }
.bulk-th.bw-olchov { flex: 0 0 88px; }
.bulk-th.bw-soni   { flex: 0 0 64px; text-align: center; }
.bulk-th.bw-faol   { flex: 0 0 48px; text-align: center; }
.bulk-th.bw-acts   { flex: 0 0 60px; }

.bulk-body {
  flex: 1; overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--card-border) transparent;
}

.bulk-row {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 16px;
  border-bottom: 1px solid var(--card-border);
  transition: background .1s;
  position: relative;
}
.bulk-row:hover { background: var(--mini-bg); }
.bulk-row--err  { background: rgba(239,68,68,.04); }

.bulk-td        { flex: 1; min-width: 0; position: relative; }
.bulk-td.bw-num    { flex: 0 0 32px; }
.bulk-td.bw-nomi   { flex: 2; }
.bulk-td.bw-flex   { flex: 1; }
.bulk-td.bw-shtrix { flex: 1.4; }
.bulk-td.bw-olchov { flex: 0 0 88px; }
.bulk-td.bw-soni   { flex: 0 0 64px; }
.bulk-td.bw-faol   { flex: 0 0 48px; display:flex; justify-content:center; }
.bulk-td.bw-acts   { flex: 0 0 60px; display:flex; gap:3px; justify-content:flex-end; }

.bulk-num {
  width: 22px; height: 22px; border-radius: 6px;
  background: var(--mini-bg); border: 1px solid var(--card-border);
  font-size: 11px; font-weight: 600; color: var(--muted);
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto;
}

.bulk-in {
  width: 100%; height: 34px; padding: 0 9px;
  border: 1.5px solid var(--card-border); border-radius: 8px;
  background: var(--card-bg); color: var(--body); font-size: 12px;
  outline: none; transition: border-color .12s;
}
.bulk-in:focus { border-color: #8b5cf6; box-shadow: 0 0 0 2px rgba(139,92,246,.1); }
.bulk-in--err  { border-color: rgba(239,68,68,.5); background: rgba(239,68,68,.04); }
.bulk-in--num  { text-align: center; padding: 0 4px; }
.bulk-in::placeholder { color: var(--muted); font-size: 11px; }

.bulk-row-err {
  position: absolute; top: 100%; left: 0; z-index: 10;
  font-size: 10px; color: #ef4444; white-space: nowrap;
  padding: 1px 4px;
}

.bulk-sel {
  width: 100%; height: 34px; padding: 0 7px;
  border: 1.5px solid var(--card-border); border-radius: 8px;
  background: var(--card-bg); color: var(--body); font-size: 12px;
  outline: none; cursor: pointer;
}
.bulk-sel:focus { border-color: #8b5cf6; }

.bulk-shtrix { display: flex; gap: 4px; align-items: center; }
.bulk-shtrix .bulk-in { flex: 1; }
.bulk-gen-btn {
  width: 34px; height: 34px; border-radius: 8px; flex-shrink: 0;
  border: 1.5px solid rgba(139,92,246,.25); background: rgba(139,92,246,.07);
  color: #8b5cf6; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: .12s;
}
.bulk-gen-btn:hover { background: rgba(139,92,246,.15); }
.bulk-gen-btn svg { width: 13px; height: 13px; }

.bulk-fill-btn {
  position: absolute; right: -2px; top: 50%; transform: translateY(-50%);
  width: 20px; height: 20px; border-radius: 5px;
  border: 1px solid rgba(139,92,246,.3); background: rgba(139,92,246,.1);
  color: #8b5cf6; cursor: pointer; display: flex; align-items: center; justify-content: center;
  z-index: 5; transition: .1s;
}
.bulk-fill-btn:hover { background: rgba(139,92,246,.22); }
.bulk-fill-btn svg { width: 10px; height: 10px; }

.bulk-toggle {
  width: 36px; height: 20px; border-radius: 10px;
  border: none; background: var(--card-border);
  cursor: pointer; position: relative; transition: background .2s;
  flex-shrink: 0;
}
.bulk-toggle--on { background: #8b5cf6; }
.bulk-toggle-knob {
  position: absolute; top: 3px; left: 3px;
  width: 14px; height: 14px; border-radius: 50%;
  background: #fff; transition: transform .2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.bulk-toggle--on .bulk-toggle-knob { transform: translateX(16px); }

.bulk-act-btn {
  width: 28px; height: 28px; border-radius: 7px; border: none;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: .12s;
}
.bulk-act-btn svg { width: 13px; height: 13px; }
.bulk-act-btn--dup { background: rgba(139,92,246,.08); color: #8b5cf6; }
.bulk-act-btn--dup:hover { background: rgba(139,92,246,.18); }
.bulk-act-btn--del { background: rgba(239,68,68,.07); color: #ef4444; }
.bulk-act-btn--del:hover { background: rgba(239,68,68,.16); }
.bulk-act-btn--del:disabled { opacity: .3; cursor: not-allowed; }

.bulk-count-badge {
  font-size: 12px; font-weight: 600; color: var(--muted);
  padding: 0 12px;
}

/* ── Toast ──────────────────────────────────────────────────────────────────── */
.toast-stack {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  display: flex; flex-direction: column; gap: 8px;
  pointer-events: none;
}
.toast {
  display: flex; align-items: center; gap: 10px;
  min-width: 280px; max-width: 380px;
  padding: 12px 14px; border-radius: 12px;
  border: 1px solid;
  box-shadow: 0 8px 24px rgba(0,0,0,.18);
  pointer-events: all;
  backdrop-filter: blur(8px);
}
.toast--warning { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.35); color: #f59e0b; }
.toast--error   { background: rgba(239,68,68,.12);  border-color: rgba(239,68,68,.35);  color: #ef4444; }
.toast--success { background: rgba(16,185,129,.12); border-color: rgba(16,185,129,.35); color: #10b981; }
.toast-ic { flex-shrink: 0; }
.toast-ic svg { width: 18px; height: 18px; display: block; }
.toast-msg { flex: 1; font-size: 13px; font-weight: 500; line-height: 1.4; }
.toast-close {
  flex-shrink: 0; width: 22px; height: 22px; border: none; background: transparent;
  cursor: pointer; opacity: .6; color: inherit; display: flex; align-items: center; justify-content: center;
  border-radius: 5px; transition: .1s;
}
.toast-close:hover { opacity: 1; background: rgba(255,255,255,.12); }
.toast-close svg { width: 12px; height: 12px; }

.toast-enter-active { transition: .25s ease; }
.toast-leave-active { transition: .2s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(40px) scale(.95); }
.toast-leave-to     { opacity: 0; transform: translateX(40px) scale(.95); }
</style>
