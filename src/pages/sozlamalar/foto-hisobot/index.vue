<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import SozDataTable from '../components/SozDataTable.vue'
import SozModal from '../components/SozModal.vue'
import type { FotoHisobotKategoriya } from '../types'
import type { Column } from '../types'

const rows = ref<FotoHisobotKategoriya[]>([
  { id: 'fh1', nomi: 'Vitrina', majburiy: true, faol: true },
  { id: 'fh2', nomi: 'Tovar joylashuvi', majburiy: true, faol: true },
  { id: 'fh3', nomi: 'Narx belgilari', majburiy: false, faol: true },
  { id: 'fh4', nomi: 'Reklama materiallari', majburiy: false, faol: true },
])

const cols: Column<FotoHisobotKategoriya>[] = [
  { key: 'id', label: 'ID', width: '80px' },
  { key: 'nomi', label: 'Nomi', sortable: true },
  { key: 'majburiy', label: 'Majburiy', width: '100px' },
  { key: 'faol', label: 'Holat', width: '100px' },
]

type ModalMode = 'add' | 'edit' | null
const modalMode = ref<ModalMode>(null)
const editId = ref<string | null>(null)
const form = reactive<Partial<FotoHisobotKategoriya>>({ nomi: '', majburiy: false, faol: true })
const search = ref('')

const filtered = computed(() =>
  rows.value.filter(r => !search.value || r.nomi.toLowerCase().includes(search.value.toLowerCase()))
)

function save() {
  if (!form.nomi?.trim()) return
  if (editId.value) {
    const idx = rows.value.findIndex(r => r.id === editId.value)
    if (idx !== -1) rows.value[idx] = { ...form, id: editId.value! } as FotoHisobotKategoriya
  } else {
    rows.value.push({ ...form, id: `fh${Date.now()}` } as FotoHisobotKategoriya)
  }
  modalMode.value = null
}
</script>

<template>
  <div class="page">
    <div class="page-hd">
      <h2 class="page-title">Foto-hisobot kategoriyasi</h2>
    </div>
    <div class="toolbar">
      <button class="add-btn" @click="() => { Object.assign(form,{nomi:'',majburiy:false,faol:true}); editId=null; modalMode='add' }">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd"/></svg>
        Kategoriya qo'shish
      </button>
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
      <template #cell-majburiy="{ value }">
        <span :class="['badge', value ? 'badge--red' : 'badge--gray']">{{ value ? 'Majburiy' : "Ixtiyoriy" }}</span>
      </template>
      <template #cell-faol="{ value }">
        <span :class="['badge', value ? 'badge--green' : 'badge--gray']">{{ value ? 'Faol' : 'Faol emas' }}</span>
      </template>
    </SozDataTable>

    <SozModal :show="modalMode!==null" :title="modalMode==='add' ? 'Kategoriya qo\'shish' : 'Tahrirlash'" @close="modalMode=null">
      <div class="fm-body">
        <div class="fm-field">
          <label class="fm-lbl">Nomi <span class="req">*</span></label>
          <input v-model="form.nomi" class="fm-in" placeholder="Masalan: Vitrina"/>
        </div>
        <div class="fm-row">
          <label class="fm-toggle">
            <input type="checkbox" v-model="form.majburiy"/>
            <span class="fm-toggle-t"><span class="fm-toggle-th"/></span>
            <span class="fm-toggle-lbl">Majburiy</span>
          </label>
          <label class="fm-toggle">
            <input type="checkbox" v-model="form.faol"/>
            <span class="fm-toggle-t"><span class="fm-toggle-th"/></span>
            <span class="fm-toggle-lbl">Faol</span>
          </label>
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
.toolbar { display:flex; align-items:center; justify-content:space-between; gap:10px; }
.add-btn { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 14px; border-radius:9px; border:none; background:linear-gradient(135deg,#a78bfa,#8b5cf6); color:#fff; font-size:12px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(139,92,246,.28); }
.add-btn svg { width:14px; height:14px; }
.srch-box { display:flex; align-items:center; gap:7px; height:34px; padding:0 11px; background:var(--card-bg); border:1px solid var(--card-border); border-radius:9px; min-width:180px; }
.srch-box svg { width:14px; height:14px; color:var(--muted); flex-shrink:0; }
.srch-in { border:none; background:transparent; outline:none; font-size:12px; color:var(--body); width:100%; }
.srch-in::placeholder { color:var(--muted); }
.row-count { font-size:12px; color:var(--muted); }
.badge { display:inline-flex; padding:2px 9px; border-radius:99px; font-size:11px; font-weight:600; }
.badge--green { background:rgba(16,185,129,.1); color:#10b981; }
.badge--red { background:rgba(239,68,68,.08); color:#ef4444; }
.badge--gray { background:var(--mini-bg); color:var(--muted); }
.fm-body { display:flex; flex-direction:column; gap:14px; }
.fm-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:center; }
.fm-field { display:flex; flex-direction:column; gap:5px; }
.fm-lbl { font-size:12px; font-weight:600; color:var(--muted); }
.req { color:#ef4444; }
.fm-in { height:38px; padding:0 12px; border-radius:9px; border:1px solid var(--card-border); background:var(--card-bg); color:var(--body); font-size:13px; outline:none; transition:.15s; width:100%; }
.fm-in:focus { border-color:#8b5cf6; box-shadow:0 0 0 3px rgba(139,92,246,.12); }
.fm-toggle { display:inline-flex; align-items:center; gap:10px; cursor:pointer; }
.fm-toggle input { display:none; }
.fm-toggle-t { display:block; width:40px; height:22px; background:var(--card-border); border-radius:99px; position:relative; transition:.2s; }
.fm-toggle input:checked + .fm-toggle-t { background:#8b5cf6; }
.fm-toggle-th { position:absolute; top:2px; left:2px; width:18px; height:18px; background:#fff; border-radius:50%; transition:.2s; }
.fm-toggle input:checked + .fm-toggle-t .fm-toggle-th { left:20px; }
.fm-toggle-lbl { font-size:13px; color:var(--body); }
.fm-btn-cancel { height:36px; padding:0 16px; border-radius:9px; border:1px solid var(--card-border); background:transparent; color:var(--muted); font-size:13px; cursor:pointer; }
.fm-btn-save { height:36px; padding:0 18px; border-radius:9px; border:none; background:linear-gradient(135deg,#a78bfa,#8b5cf6); color:#fff; font-size:13px; font-weight:600; cursor:pointer; box-shadow:0 2px 8px rgba(139,92,246,.3); }
</style>
