<template>
  <div class="hp-wrap">
    <!-- Header -->
    <div class="hp-head">
      <div>
        <h1 class="hp-title">Trip Sheet (marshrut varag'i)</h1>
        <p class="hp-sub">Dostavchikning kunlik yetkazib berish ro'yxati va bosqichlari</p>
      </div>
      <button class="ts-btn" @click="openCreate">+ Yangi trip sheet</button>
    </div>

    <!-- Filtrlar -->
    <div class="hp-filters">
      <select v-model="fDostavchi" class="hp-select" @change="load">
        <option value="">Barcha dostavchilar</option>
        <option v-for="d in dostavchilar" :key="d.id" :value="d.id">{{ d.ism }}</option>
      </select>
      <input v-model="fSana" type="date" class="hp-date" @change="load"/>
    </div>

    <!-- Ro'yxat + detail -->
    <div class="ts-layout">
      <div class="ts-list">
        <div v-if="loading" class="hp-skel-list"><div v-for="i in 3" :key="i" class="hp-skel hp-skel--sm"/></div>
        <div v-else-if="!trips.length" class="hp-empty">Trip sheet topilmadi</div>
        <div v-else v-for="t in trips" :key="t.id" class="ts-card" :class="{ 'ts-card--on': selected?.id === t.id }" @click="select(t)">
          <div class="ts-card-hd">
            <span class="ts-raqam">{{ t.raqam }}</span>
            <span class="ts-badge" :class="'ts-badge--' + t.holat">{{ HOLAT_LABEL[t.holat] }}</span>
          </div>
          <div class="ts-card-meta">
            <span>🚚 {{ t.dostavchi_nomi }}</span>
            <span>📅 {{ t.sana }}</span>
            <span>📦 {{ t.hujjat_soni }} hujjat</span>
          </div>
        </div>
      </div>

      <div class="ts-detail" v-if="selected">
        <div class="hp-card">
          <div class="hp-card-hd">
            <div class="hp-card-title">{{ selected.raqam }} — {{ selected.dostavchi_nomi }}</div>
            <span class="ts-badge" :class="'ts-badge--' + selected.holat">{{ HOLAT_LABEL[selected.holat] }}</span>
          </div>

          <div v-if="loadingDetail" class="hp-skel hp-skel--sm"/>
          <div v-else class="ts-doc-list">
            <div v-if="!detail?.arizalar?.length" class="hp-empty" style="padding:24px">Hujjat biriktirilmagan</div>
            <div v-for="a in detail?.arizalar || []" :key="a.id" class="ts-doc-item">
              <span class="ts-doc-order">{{ a.trip_tartib }}</span>
              <div class="ts-doc-body">
                <div class="ts-doc-name">{{ a.mijoz_nomi || a.mijoz?.nomi }}</div>
                <div class="ts-doc-meta">{{ a.raqam }} · {{ fmtSum(a.jami_summa) }} so'm · {{ HOLAT_LABEL[a.holat] || a.holat }}</div>
              </div>
              <button class="ts-doc-del" @click="removeAriza(a.id)" title="Trip sheetdan olib tashlash">✕</button>
            </div>
          </div>

          <!-- Hujjat qo'shish -->
          <div class="ts-add-block">
            <select v-model="addArizaId" class="hp-select" style="width:100%">
              <option value="">Tayinlanmagan hujjat qo'shish...</option>
              <option v-for="a in tayinlanmagan" :key="a.id" :value="a.id">
                {{ a.raqam }} — {{ a.mijoz_nomi || a.mijoz?.nomi }} ({{ fmtSum(a.jami_summa) }})
              </option>
            </select>
            <button class="ts-btn ts-btn--sm" :disabled="!addArizaId" @click="addAriza">Qo'shish</button>
          </div>
        </div>
      </div>

      <div class="ts-detail hp-empty" v-else style="align-self:flex-start">Trip sheet tanlang</div>
    </div>

    <!-- Yaratish modal -->
    <div v-if="createModal" class="ts-modal-ov" @click.self="createModal = false">
      <div class="ts-modal">
        <div class="ts-modal-title">Yangi trip sheet</div>
        <div class="ts-modal-row">
          <label>Dostavchik</label>
          <select v-model="newDostavchi" class="hp-select">
            <option value="">Tanlang</option>
            <option v-for="d in dostavchilar" :key="d.id" :value="d.id">{{ d.ism }}</option>
          </select>
        </div>
        <div class="ts-modal-row">
          <label>Sana</label>
          <input v-model="newSana" type="date" class="hp-date"/>
        </div>
        <div class="ts-modal-actions">
          <button class="rj-btn rj-btn--ghost" @click="createModal = false">Bekor qilish</button>
          <button class="ts-btn" :disabled="!newDostavchi || creating" @click="createTrip">{{ creating ? '...' : 'Yaratish' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
// @ts-ignore
import { tripSheetApi, dostavchiApi } from '@/api/api'
// @ts-ignore
import { useToast } from '@/composables/useToast'

const toast = useToast()

const HOLAT_LABEL: Record<string, string> = { yangi: 'Yangi', yolda: "Yo'lda", yakunlandi: 'Yakunlandi' }

const dostavchilar = ref<any[]>([])
const trips = ref<any[]>([])
const loading = ref(false)
const fDostavchi = ref<string | number>('')
const fSana = ref('')

const selected = ref<any>(null)
const detail = ref<any>(null)
const loadingDetail = ref(false)
const tayinlanmagan = ref<any[]>([])
const addArizaId = ref<string | number>('')

const createModal = ref(false)
const newDostavchi = ref<string | number>('')
const newSana = ref(new Date().toISOString().slice(0, 10))
const creating = ref(false)

async function load() {
  loading.value = true
  try {
    const p: any = {}
    if (fDostavchi.value) p.dostavchi_id = fDostavchi.value
    if (fSana.value) p.sana = fSana.value
    trips.value = await tripSheetApi.getAll(p)
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message || '')
  } finally {
    loading.value = false
  }
}

async function select(t: any) {
  selected.value = t
  loadingDetail.value = true
  try {
    detail.value = await tripSheetApi.getById(t.id)
    tayinlanmagan.value = await tripSheetApi.tayinlanmagan({ dostavchi_id: t.dostavchi_id })
  } catch (e: any) {
    toast.error('Yuklash xatosi', e.message || '')
  } finally {
    loadingDetail.value = false
  }
}

async function addAriza() {
  if (!addArizaId.value || !selected.value) return
  try {
    await tripSheetApi.addArizalar(selected.value.id, [addArizaId.value])
    addArizaId.value = ''
    await select(selected.value)
    await load()
    toast.success('Qo\'shildi', 'Hujjat trip sheetga biriktirildi')
  } catch (e: any) {
    toast.error('Xatolik', e.message || '')
  }
}

async function removeAriza(arizaId: number) {
  if (!selected.value) return
  try {
    await tripSheetApi.removeAriza(selected.value.id, arizaId)
    await select(selected.value)
    await load()
  } catch (e: any) {
    toast.error('Xatolik', e.message || '')
  }
}

function openCreate() {
  newDostavchi.value = ''
  newSana.value = new Date().toISOString().slice(0, 10)
  createModal.value = true
}

async function createTrip() {
  creating.value = true
  try {
    const trip = await tripSheetApi.create({ dostavchi_id: newDostavchi.value, sana: newSana.value, ariza_idlar: [] })
    createModal.value = false
    await load()
    const found = trips.value.find((t: any) => t.id === trip.id)
    if (found) await select(found)
    toast.success('Yaratildi', trip.raqam)
  } catch (e: any) {
    toast.error('Xatolik', e.message || '')
  } finally {
    creating.value = false
  }
}

function fmtSum(v: number) {
  if (!v) return '0'
  return Number(v).toLocaleString('uz-UZ')
}

onMounted(async () => {
  try {
    const d = await dostavchiApi.getAll()
    dostavchilar.value = d.rows || d || []
  } catch {}
  await load()
})
watch(selected, () => {}, { deep: false })
</script>

<style scoped>
.hp-wrap { display:flex; flex-direction:column; gap:18px; padding:2px 0 40px; }
.hp-head { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; flex-wrap:wrap; }
.hp-title { font-size:22px; font-weight:900; color:#1e293b; margin:0 0 4px; letter-spacing:-.3px; }
.hp-sub { font-size:13px; color:#94a3b8; margin:0; }
.hp-filters { display:flex; gap:8px; flex-wrap:wrap; }
.hp-select, .hp-date { border:1.5px solid #e2e8f0; background:#fff; border-radius:10px; padding:8px 12px; font-size:13px; color:#1e293b; }
.hp-select:focus, .hp-date:focus { outline:none; border-color:#6366f1; }
.hp-empty { text-align:center; padding:60px 20px; color:#94a3b8; font-size:14px; background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; }
.hp-skel-list { display:flex; flex-direction:column; gap:12px; }
.hp-skel { border-radius:16px; background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:hp-shim 1.4s ease infinite; }
.hp-skel--sm { height:90px; }
@keyframes hp-shim { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
.hp-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:16px; padding:16px; }
.hp-card-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
.hp-card-title { font-size:14px; font-weight:800; color:#1e293b; }

.ts-btn { padding:9px 18px; border:none; border-radius:10px; background:#6366f1; color:#fff; font-size:13px; font-weight:700; cursor:pointer; }
.ts-btn:hover { background:#4f46e5; }
.ts-btn:disabled { opacity:.5; cursor:not-allowed; }
.ts-btn--sm { padding:8px 14px; white-space:nowrap; }

.ts-layout { display:grid; grid-template-columns:340px 1fr; gap:16px; align-items:start; }
.ts-list { display:flex; flex-direction:column; gap:10px; }
.ts-card { background:#fff; border:1.5px solid #e8ecf8; border-radius:14px; padding:13px; cursor:pointer; transition:.15s; }
.ts-card:hover { border-color:#c7d2fe; }
.ts-card--on { border-color:#6366f1; background:#f5f5ff; }
.ts-card-hd { display:flex; align-items:center; justify-content:space-between; margin-bottom:7px; }
.ts-raqam { font-size:13.5px; font-weight:800; color:#1e293b; }
.ts-badge { font-size:10.5px; font-weight:700; padding:3px 9px; border-radius:999px; white-space:nowrap; }
.ts-badge--yangi { background:#f1f5f9; color:#64748b; }
.ts-badge--yolda { background:#eef2ff; color:#4f46e5; }
.ts-badge--yakunlandi { background:#f0fdf4; color:#16a34a; }
.ts-card-meta { display:flex; flex-direction:column; gap:2px; font-size:11.5px; color:#94a3b8; }

.ts-detail { min-height:200px; }
.ts-doc-list { display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
.ts-doc-item { display:flex; align-items:center; gap:10px; padding:10px 11px; background:#f8fafc; border-radius:11px; }
.ts-doc-order { width:22px; height:22px; border-radius:7px; background:#eef2ff; color:#6366f1; font-size:11.5px; font-weight:800; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ts-doc-body { flex:1; min-width:0; }
.ts-doc-name { font-size:13px; font-weight:700; color:#1e293b; }
.ts-doc-meta { font-size:11px; color:#94a3b8; }
.ts-doc-del { border:none; background:transparent; color:#cbd5e1; cursor:pointer; font-size:14px; }
.ts-doc-del:hover { color:#ef4444; }

.ts-add-block { display:flex; gap:8px; border-top:1px solid #f1f5f9; padding-top:14px; }

.ts-modal-ov { position:fixed; inset:0; background:rgba(15,23,42,.5); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; }
.ts-modal { background:#fff; border-radius:18px; padding:22px; width:380px; max-width:100%; }
.ts-modal-title { font-size:16px; font-weight:800; color:#1e293b; margin-bottom:16px; }
.ts-modal-row { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
.ts-modal-row label { font-size:12.5px; color:#475569; font-weight:600; }
.ts-modal-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }
.rj-btn--ghost { padding:9px 16px; border:none; border-radius:10px; background:#f1f5f9; color:#475569; font-size:13px; font-weight:700; cursor:pointer; }
.rj-btn--ghost:hover { background:#e2e8f0; }

@media(max-width:800px) { .ts-layout { grid-template-columns:1fr; } }
</style>
