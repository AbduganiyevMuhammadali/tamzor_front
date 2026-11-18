<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import SozDataTable from '../components/SozDataTable.vue'
import SozModal from '../components/SozModal.vue'
import type { RadEtishSababi } from '../types'
import type { Column } from '../types'

const rows = ref<RadEtishSababi[]>([
  { id: 're1', nomi: 'Tovar yetishmaydi', tur: 'buyurtma', faol: true },
  { id: 're2', nomi: 'Narx mos emas', tur: 'buyurtma', faol: true },
  { id: 're3', nomi: 'Mijoz uyda yo\'q', tur: 'buyurtma', faol: true },
  { id: 're4', nomi: 'Sifat muammosi', tur: 'qaytarish', faol: true },
  { id: 're5', nomi: 'Yaroqlilik muddati', tur: 'qaytarish', faol: true },
])

const cols: Column<RadEtishSababi>[] = [
  { key: 'id', label: 'ID', width: '80px' },
  { key: 'nomi', label: 'Nomi', sortable: true },
  { key: 'tur', label: 'Tur', width: '120px' },
  { key: 'faol', label: 'Holat', width: '100px' },
]

type ModalMode = 'add' | 'edit' | null
const modalMode = ref<ModalMode>(null)
const editId = ref<string | null>(null)
const form = reactive<Partial<RadEtishSababi>>({ nomi: '', tur: 'buyurtma', faol: true })
const search = ref('')
const filterTur = ref<'all' | 'buyurtma' | 'qaytarish'>('all')

const filtered = computed(() =>
  rows.value.filter(r => {
    if (filterTur.value !== 'all' && r.tur !== filterTur.value) return false
    if (search.value && !r.nomi.toLowerCase().includes(search.value.toLowerCase())) return false
    return true
  })
)

function save() {
  if (!form.nomi?.trim()) return
  if (editId.value) {
    const idx = rows.value.findIndex(r => r.id === editId.value)
    if (idx !== -1) rows.value[idx] = { ...form, id: editId.value! } as RadEtishSababi
  } else {
    rows.value.push({ ...form, id: `re${Date.now()}` } as RadEtishSababi)
  }
  modalMode.value = null
}
</script>

<template>
  <div class="page">
    <div class="page-hd">
      <h2 class="page-title">Rad etish sabablari</h2>
    </div>
    <div class="toolbar">
      <div class="tl">
        <button class="add-btn" @click="() => { Object.assign(form,{nomi:'',tur:'buyurtma',faol:true}); editId=null; modalMode='add' }">
          <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
          Sabab qo'shish
        </button>
        <div class="tur-tabs">
          <button :class="['tur-tab', filterTur==='all' && 'tur-tab--on']" @click="filterTur='all'">Hammasi</button>
          <button :class="['tur-tab', filterTur==='buyurtma' && 'tur-tab--on']" @click="filterTur='buyurtma'">Buyurtma</button>
          <button :class="['tur-tab', filterTur==='qaytarish' && 'tur-tab--on']" @click="filterTur='qaytarish'">Qaytarish</button>
        </div>
      </div>
      <div class="srch-box">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/></svg>
        <input v-model="search" placeholder="Qidirish..." class="srch-in"/>
      </div>
    </div>
    <div class="row-count">{{ filtered.length }} ta hisobot</div>
    <SozDataTable :columns="cols" :rows="filtered" row-key="id"
      @edit="(r) => { Object.assign(form, r); editId=r.id; modalMode='edit' }"
      @delete="(r) => rows = rows.filter(x => x.id !== r.id)"
      @view="() => {}">
      <template #cell-tur="{ value }">
        <span :class="['tur-badge', value==='buyurtma' ? 'tur-badge--buy' : 'tur-badge--ret']">
          {{ value === 'buyurtma' ? 'Buyurtma' : 'Qaytarish' }}
        </span>
      </template>
      <template #cell-faol="{ value }">
        <span :class="['faol-badge', value ? 'faol-badge--on' : 'faol-badge--off']">
          <span class="faol-dot"/>{{ value ? 'Faol' : 'Faol emas' }}
        </span>
      </template>
    </SozDataTable>

    <SozModal :show="modalMode!==null" :title="modalMode==='add' ? 'Sabab qo\'shish' : 'Tahrirlash'" @close="modalMode=null">
      <div class="fm-body">
        <div class="fm-field">
          <label class="fm-lbl">Nomi <span class="req">*</span></label>
          <input v-model="form.nomi" class="fm-in" placeholder="Sabab nomi"/>
        </div>
        <div class="fm-row">
          <div class="fm-field">
            <label class="fm-lbl">Turi</label>
            <select v-model="form.tur" class="fm-sel">
              <option value="buyurtma">Buyurtma rad etish</option>
              <option value="qaytarish">Qaytarish sababi</option>
            </select>
          </div>
          <div class="fm-field" style="justify-content:flex-end">
            <label class="fm-lbl">Holat</label>
            <label class="fm-toggle">
              <input type="checkbox" v-model="form.faol"/>
              <span class="fm-toggle-t"><span class="fm-toggle-th"/></span>
              <span class="fm-toggle-lbl">{{ form.faol ? 'Faol' : 'Faol emas' }}</span>
            </label>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="fm-btn-cancel" @click="modalMode=null">Bekor qilish</button>
        <button class="fm-btn-save" @click="save">Saqlash</button>
      </template>
    </SozModal>
  </div>
</template>

<style scoped>
.page { display:flex; flex-direction:column; gap:14px; }
.page-hd { display:flex; align-items:center; }
.page-title { font-size:20px; font-weight:700; color:var(--title); margin:0; }
.toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.tl { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.add-btn { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 14px; border-radius:9px; border:none; background:linear-gradient(135deg,#818cf8,#6366f1); color:#fff; font-size:12px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(99,102,241,.28); }
.add-btn svg { width:14px; height:14px; }
.tur-tabs { display:inline-flex; gap:2px; border:1px solid var(--card-border); border-radius:9px; padding:3px; background:var(--card-bg); }
.tur-tab { padding:4px 12px; border-radius:6px; border:none; background:transparent; color:var(--muted); font-size:12px; cursor:pointer; transition:.12s; }
.tur-tab--on { background:linear-gradient(135deg,#818cf8,#6366f1); color:#fff; }
.srch-box { display:flex; align-items:center; gap:7px; height:34px; padding:0 11px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:9px; min-width:180px; }
.srch-box svg { width:14px; height:14px; color:var(--muted); flex-shrink:0; }
.srch-in { border:none; background:transparent; outline:none; font-size:12px; color:var(--body); width:100%; }
.srch-in::placeholder { color:var(--muted); }
.row-count { font-size:12px; color:var(--muted); }
.tur-badge { display:inline-flex; padding:2px 9px; border-radius:99px; font-size:11px; font-weight:600; }
.tur-badge--buy { background:rgba(99,102,241,.1); color:#6366f1; }
.tur-badge--ret { background:rgba(245,158,11,.1); color:#f59e0b; }
.faol-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:99px; font-size:11px; font-weight:600; }
.faol-badge--on { background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.2); }
.faol-badge--off { background:rgba(239,68,68,.06); color:#ef4444; border:1px solid rgba(239,68,68,.15); }
.faol-dot { width:5px; height:5px; border-radius:50%; flex-shrink:0; background:currentColor; }
.fm-body { display:flex; flex-direction:column; gap:14px; }
.fm-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
.fm-field { display:flex; flex-direction:column; gap:5px; }
.fm-lbl { font-size:12px; font-weight:600; color:var(--muted); }
.req { color:#ef4444; }
.fm-in,.fm-sel { height:38px; padding:0 12px; border-radius:9px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:13px; outline:none; transition:.15s; width:100%; }
.fm-in:focus,.fm-sel:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
.fm-toggle { display:inline-flex; align-items:center; gap:10px; cursor:pointer; }
.fm-toggle input { display:none; }
.fm-toggle-t { display:block; width:40px; height:22px; background:var(--card-border); border-radius:99px; position:relative; transition:.2s; }
.fm-toggle input:checked + .fm-toggle-t { background:#6366f1; }
.fm-toggle-th { position:absolute; top:2px; left:2px; width:18px; height:18px; background:#fff; border-radius:50%; transition:.2s; }
.fm-toggle input:checked + .fm-toggle-t .fm-toggle-th { left:20px; }
.fm-toggle-lbl { font-size:13px; color:var(--body); }
.fm-btn-cancel { height:36px; padding:0 16px; border-radius:9px; border:1px solid var(--card-border); background:transparent; color:var(--muted); font-size:13px; cursor:pointer; }
.fm-btn-save { height:36px; padding:0 18px; border-radius:9px; border:none; background:linear-gradient(135deg,#818cf8,#6366f1); color:#fff; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(99,102,241,.3); }
</style>
